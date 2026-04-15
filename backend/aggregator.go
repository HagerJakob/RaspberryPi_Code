package main

import (
	"sync"
	"time"
)

type DataAggregator struct {
	mu          sync.Mutex
	buffer      []RawDataPoint
	last1Sec    time.Time
	last10Sec   time.Time
}

func NewDataAggregator() *DataAggregator {
	now := time.Now()
	return &DataAggregator{
		buffer:    make([]RawDataPoint, 0, 256),
		last1Sec:  now,
		last10Sec: now,
	}
}

func (a *DataAggregator) AddData(point RawDataPoint) {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.buffer = append(a.buffer, point)
	cutoff := time.Now().Add(-10 * time.Second)
	trimmed := a.buffer[:0]
	for _, item := range a.buffer {
		if item.Timestamp.After(cutoff) {
			trimmed = append(trimmed, item)
		}
	}
	a.buffer = trimmed
}

func (a *DataAggregator) ShouldSave1Sec() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return time.Since(a.last1Sec) >= time.Second
}

func (a *DataAggregator) ShouldSave10Sec() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return time.Since(a.last10Sec) >= 10*time.Second
}

func (a *DataAggregator) Reset1SecTimer() {
	a.mu.Lock()
	a.last1Sec = time.Now()
	a.mu.Unlock()
}

func (a *DataAggregator) Reset10SecTimer() {
	a.mu.Lock()
	a.last10Sec = time.Now()
	a.mu.Unlock()
}

func (a *DataAggregator) OneSecAverage() map[string]float64 {
	a.mu.Lock()
	defer a.mu.Unlock()

	cutoff := time.Now().Add(-1 * time.Second)
	rpmVals := make([]float64, 0, 32)
	speedVals := make([]float64, 0, 32)
	for _, p := range a.buffer {
		if !p.Timestamp.After(cutoff) {
			continue
		}
		if p.RPM != nil {
			rpmVals = append(rpmVals, *p.RPM)
		}
		if p.Speed != nil {
			speedVals = append(speedVals, *p.Speed)
		}
	}

	result := map[string]float64{}
	if len(rpmVals) > 0 {
		result["rpm"] = mean(rpmVals)
	}
	if len(speedVals) > 0 {
		result["speed"] = mean(speedVals)
	}
	return result
}

func (a *DataAggregator) TenSecAverage() map[string]float64 {
	a.mu.Lock()
	defer a.mu.Unlock()

	cutoff := time.Now().Add(-10 * time.Second)
	collector := map[string][]float64{
		"coolant_temp": {},
		"oil_temp":     {},
		"fuel_level":   {},
		"voltage":      {},
		"boost":        {},
		"oil_pressure": {},
	}

	for _, p := range a.buffer {
		if !p.Timestamp.After(cutoff) {
			continue
		}
		if p.CoolantTemp != nil {
			collector["coolant_temp"] = append(collector["coolant_temp"], *p.CoolantTemp)
		}
		if p.OilTemp != nil {
			collector["oil_temp"] = append(collector["oil_temp"], *p.OilTemp)
		}
		if p.FuelLevel != nil {
			collector["fuel_level"] = append(collector["fuel_level"], *p.FuelLevel)
		}
		if p.Voltage != nil {
			collector["voltage"] = append(collector["voltage"], *p.Voltage)
		}
		if p.Boost != nil {
			collector["boost"] = append(collector["boost"], *p.Boost)
		}
		if p.OilPressure != nil {
			collector["oil_pressure"] = append(collector["oil_pressure"], *p.OilPressure)
		}
	}

	result := map[string]float64{}
	for key, values := range collector {
		if len(values) > 0 {
			result[key] = mean(values)
		}
	}
	return result
}

func mean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, value := range values {
		sum += value
	}
	return sum / float64(len(values))
}
