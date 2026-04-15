package main

import (
	"os"
	"strconv"
	"time"
)

type AppConfig struct {
	BroadcastInterval time.Duration
	UARTTimeout       time.Duration
	TimeOffset        time.Duration
	LogPath           string
	LogMaxBytes       int64
	LogRotateCount    int
}

func LoadAppConfig() AppConfig {
	frameMillis := defaultFrameMillis
	if raw := os.Getenv("BROADCAST_INTERVAL_MS"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			frameMillis = parsed
		}
	}

	uartTimeout := defaultUARTTimeout
	if raw := os.Getenv("UART_TIMEOUT_SECONDS"); raw != "" {
		if parsed, err := strconv.ParseFloat(raw, 64); err == nil && parsed > 0 {
			uartTimeout = time.Duration(parsed * float64(time.Second))
		}
	}

	offsetHours := 1.0
	if raw := os.Getenv("TIME_OFFSET_HOURS"); raw != "" {
		if parsed, err := strconv.ParseFloat(raw, 64); err == nil {
			offsetHours = parsed
		}
	}

	logPath := os.Getenv("LOG_FILE_PATH")
	if logPath == "" {
		logPath = defaultLogFilePath
	}

	logMaxBytes := int64(0)
	if raw := os.Getenv("LOG_MAX_BYTES"); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil && parsed > 0 {
			logMaxBytes = parsed
		}
	}

	logRotateCount := defaultLogRotateCount
	if raw := os.Getenv("LOG_ROTATE_COUNT"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			logRotateCount = parsed
		}
	}

	return AppConfig{
		BroadcastInterval: time.Duration(frameMillis) * time.Millisecond,
		UARTTimeout:       uartTimeout,
		TimeOffset:        time.Duration(offsetHours * float64(time.Hour)),
		LogPath:           logPath,
		LogMaxBytes:       logMaxBytes,
		LogRotateCount:    logRotateCount,
	}
}
