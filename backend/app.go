package main

import (
	"context"
	"log"
	"math"
	"strconv"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx          context.Context
	cancel       context.CancelFunc
	aggregator   *DataAggregator
	logger       *LogWriter
	serial       *SerialService
	config       AppConfig
	frameMillis  time.Duration
	uartTimeout  time.Duration

	mu           sync.RWMutex
	data         OBDData
	lastSerialAt time.Time
}

func NewApp() *App {
	cfg := LoadAppConfig()

	return &App{
		aggregator:  NewDataAggregator(),
		logger:      NewLogWriterWithOptions(cfg.LogPath, cfg.LogMaxBytes, cfg.LogRotateCount),
		serial:      NewSerialService(),
		config:      cfg,
		frameMillis: cfg.BroadcastInterval,
		uartTimeout: cfg.UARTTimeout,
		data: OBDData{
			RPM:     "0",
			Speed:   "0",
			Coolant: "20",
			Oil:     "60",
			Fuel:    "73",
			Voltage: "12.1",
			Boost:   "1.1",
			OilPress:"0.3",
		},
	}
}

func (a *App) GetRuntimeConfig() map[string]any {
	return map[string]any{
		"broadcast_interval_ms": int(a.frameMillis / time.Millisecond),
		"uart_timeout_ms":       int(a.uartTimeout / time.Millisecond),
		"time_offset_hours":     a.config.TimeOffset.Hours(),
		"log_path":              a.config.LogPath,
		"log_max_bytes":         a.config.LogMaxBytes,
		"log_rotate_count":      a.config.LogRotateCount,
		"serial_baud_rate":      a.serial.baudRate,
		"serial_candidates":     a.serial.Candidates(),
	}
}

func (a *App) GetCurrentData() OBDData {
	return a.snapshot()
}

func (a *App) startup(ctx context.Context) {
	a.ctx, a.cancel = context.WithCancel(ctx)
	frames := make(chan SerialFrame, 64)
	a.serial.Start(a.ctx, frames)
	go a.consumeFrames(frames)
	go a.broadcastLoop()
	go a.logWriterLoop()
	log.Println("wails app startup complete")
}

func (a *App) shutdown(context.Context) {
	if a.cancel != nil {
		a.cancel()
	}
}

func (a *App) consumeFrames(frames <-chan SerialFrame) {
	for frame := range frames {
		a.mu.Lock()
		if frame.Connected {
			a.data.RPM = strconv.Itoa(int(math.Max(frame.RPM, 0)))
			a.data.Speed = strconv.Itoa(int(math.Max(frame.Speed, 0)))
			a.data.Coolant = strconv.FormatFloat(frame.Coolant, 'f', 1, 64)
			a.data.UARTConnected = true
			a.lastSerialAt = frame.Received

			rpm := frame.RPM
			speed := frame.Speed
			coolant := frame.Coolant
			a.aggregator.AddData(RawDataPoint{
				Timestamp:   frame.Received,
				RPM:         &rpm,
				Speed:       &speed,
				CoolantTemp: &coolant,
				OilTemp:     floatPtr(safeParseFloat(a.data.Oil)),
				FuelLevel:   floatPtr(safeParseFloat(a.data.Fuel)),
				Voltage:     floatPtr(safeParseFloat(a.data.Voltage)),
				Boost:       floatPtr(safeParseFloat(a.data.Boost)),
				OilPressure: floatPtr(safeParseFloat(a.data.OilPress)),
			})
		} else {
			a.data.UARTConnected = false
		}
		a.mu.Unlock()
	}
}

func (a *App) snapshot() OBDData {
	a.mu.RLock()
	data := a.data
	last := a.lastSerialAt
	a.mu.RUnlock()

	if !last.IsZero() && time.Since(last) > a.uartTimeout {
		data.UARTConnected = false
	}
	data.Time = time.Now().Add(a.config.TimeOffset).Format("15:04:05")
	return data
}

func (a *App) broadcastLoop() {
	ticker := time.NewTicker(a.frameMillis)
	defer ticker.Stop()
	for {
		select {
		case <-a.ctx.Done():
			return
		case <-ticker.C:
			payload := a.snapshot()
			runtime.EventsEmit(a.ctx, "obd:data", payload)
		}
	}
}

func (a *App) logWriterLoop() {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-a.ctx.Done():
			return
		case <-ticker.C:
			a.flushAggregateLogs()
		}
	}
}

func (a *App) flushAggregateLogs() {
	if a.aggregator.ShouldSave1Sec() {
		avg1 := a.aggregator.OneSecAverage()
		if len(avg1) > 0 {
			record := map[string]any{
				"timestamp":      time.Now().Format(time.RFC3339),
				"type":           "1sec",
				"auto_id":        defaultAutoID,
				"rpm":            round3(avg1["rpm"]),
				"geschwindigkeit": round3(avg1["speed"]),
			}
			if err := a.logger.AppendRecord(record); err != nil {
				log.Printf("log append 1sec failed: %v", err)
			}
		}
		a.aggregator.Reset1SecTimer()
	}

	if a.aggregator.ShouldSave10Sec() {
		avg10 := a.aggregator.TenSecAverage()
		if len(avg10) > 0 {
			record := map[string]any{
				"timestamp":    time.Now().Format(time.RFC3339),
				"type":         "10sec",
				"auto_id":      defaultAutoID,
				"coolant_temp": round3(avg10["coolant_temp"]),
				"oil_temp":     round3(avg10["oil_temp"]),
				"fuel_level":   round3(avg10["fuel_level"]),
				"voltage":      round3(avg10["voltage"]),
				"boost":        round3(avg10["boost"]),
				"oil_pressure": round3(avg10["oil_pressure"]),
			}
			if err := a.logger.AppendRecord(record); err != nil {
				log.Printf("log append 10sec failed: %v", err)
			}
		}
		a.aggregator.Reset10SecTimer()
	}
}

func (a *App) GetHealth() map[string]any {
	s := a.snapshot()
	return map[string]any{
		"status":         "ok",
		"uart_connected": s.UARTConnected,
		"obd_ready":      s.UARTConnected,
	}
}

func (a *App) GetLogs1Sec(limit int) []map[string]any {
	items, err := a.logger.ReadRecentByType("1sec", limit)
	if err != nil {
		log.Printf("read 1sec logs failed: %v", err)
		return []map[string]any{}
	}
	return items
}

func (a *App) GetLogs10Sec(limit int) []map[string]any {
	items, err := a.logger.ReadRecentByType("10sec", limit)
	if err != nil {
		log.Printf("read 10sec logs failed: %v", err)
		return []map[string]any{}
	}
	return items
}

func (a *App) GetLogfileText() string {
	text, err := a.logger.ReadAllText()
	if err != nil {
		log.Printf("read logfile failed: %v", err)
		return ""
	}
	return text
}

func round3(value float64) float64 {
	return math.Round(value*1000) / 1000
}

func safeParseFloat(value string) float64 {
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0
	}
	return parsed
}

func floatPtr(value float64) *float64 {
	v := value
	return &v
}
