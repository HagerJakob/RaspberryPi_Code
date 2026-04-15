package main

import "time"

const (
	defaultAutoID       = 1
	defaultBaudRate     = 115200
	defaultFrameMillis  = 16
	defaultUARTTimeout  = 2 * time.Second
	defaultLogFilePath  = "/data/obd_data_log.txt"
	defaultLogRotateCount = 1
)

var defaultSerialPorts = []string{"/dev/ttyAMA0", "/dev/ttyS0", "/dev/serial0"}

// OBDData mirrors the existing frontend payload keys.
type OBDData struct {
	RPM           string `json:"RPM"`
	Speed         string `json:"SPEED"`
	Coolant       string `json:"COOLANT"`
	Oil           string `json:"OIL"`
	Fuel          string `json:"FUEL"`
	Voltage       string `json:"VOLTAGE"`
	Boost         string `json:"BOOST"`
	OilPress      string `json:"OILPRESS"`
	UARTConnected bool   `json:"UART_CONNECTED"`
	Time          string `json:"TIME"`
}

type RawDataPoint struct {
	Timestamp   time.Time
	RPM         *float64
	Speed       *float64
	CoolantTemp *float64
	OilTemp     *float64
	FuelLevel   *float64
	Voltage     *float64
	Boost       *float64
	OilPressure *float64
}

type SerialFrame struct {
	RPM       float64
	Speed     float64
	Coolant   float64
	Connected bool
	Received  time.Time
}
