package main

import (
	"testing"
	"time"
)

func TestGetRuntimeConfigIncludesCoreSettings(t *testing.T) {
	t.Setenv("BROADCAST_INTERVAL_MS", "20")
	t.Setenv("UART_TIMEOUT_SECONDS", "3")
	t.Setenv("TIME_OFFSET_HOURS", "1.5")
	t.Setenv("LOG_FILE_PATH", "/tmp/obd.log")
	t.Setenv("LOG_MAX_BYTES", "4096")
	t.Setenv("LOG_ROTATE_COUNT", "4")
	t.Setenv("SERIAL_PORTS", "/dev/ttyS0,/dev/ttyAMA0")

	app := NewApp()
	cfg := app.GetRuntimeConfig()

	if cfg["broadcast_interval_ms"] != 20 {
		t.Fatalf("unexpected broadcast interval: %v", cfg["broadcast_interval_ms"])
	}
	if cfg["uart_timeout_ms"] != 3000 {
		t.Fatalf("unexpected uart timeout: %v", cfg["uart_timeout_ms"])
	}
	if cfg["log_max_bytes"] != int64(4096) {
		t.Fatalf("unexpected log max bytes: %v", cfg["log_max_bytes"])
	}
	if cfg["log_rotate_count"] != 4 {
		t.Fatalf("unexpected rotate count: %v", cfg["log_rotate_count"])
	}
	serialCandidates, ok := cfg["serial_candidates"].([]string)
	if !ok || len(serialCandidates) < 3 {
		t.Fatalf("unexpected serial candidates: %#v", cfg["serial_candidates"])
	}
}

func TestSnapshotMarksDisconnectedAfterTimeout(t *testing.T) {
	app := NewApp()
	app.uartTimeout = 100 * time.Millisecond

	app.mu.Lock()
	app.data.UARTConnected = true
	app.lastSerialAt = time.Now().Add(-time.Second)
	app.mu.Unlock()

	snap := app.snapshot()
	if snap.UARTConnected {
		t.Fatalf("expected UART_CONNECTED false after timeout")
	}
}
