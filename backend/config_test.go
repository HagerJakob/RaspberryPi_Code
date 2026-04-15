package main

import (
	"testing"
	"time"
)

func TestLoadAppConfigDefaults(t *testing.T) {
	t.Setenv("BROADCAST_INTERVAL_MS", "")
	t.Setenv("UART_TIMEOUT_SECONDS", "")
	t.Setenv("TIME_OFFSET_HOURS", "")
	t.Setenv("LOG_FILE_PATH", "")
	t.Setenv("LOG_MAX_BYTES", "")
	t.Setenv("LOG_ROTATE_COUNT", "")

	cfg := LoadAppConfig()
	if cfg.BroadcastInterval != 16*time.Millisecond {
		t.Fatalf("unexpected default broadcast interval: %v", cfg.BroadcastInterval)
	}
	if cfg.UARTTimeout != 2*time.Second {
		t.Fatalf("unexpected default uart timeout: %v", cfg.UARTTimeout)
	}
	if cfg.TimeOffset != time.Hour {
		t.Fatalf("unexpected default time offset: %v", cfg.TimeOffset)
	}
	if cfg.LogPath == "" {
		t.Fatalf("expected default log path")
	}
	if cfg.LogMaxBytes != 0 {
		t.Fatalf("expected default log max bytes to be disabled, got %d", cfg.LogMaxBytes)
	}
	if cfg.LogRotateCount != defaultLogRotateCount {
		t.Fatalf("expected default rotate count %d, got %d", defaultLogRotateCount, cfg.LogRotateCount)
	}
}

func TestLoadAppConfigEnvOverrides(t *testing.T) {
	t.Setenv("BROADCAST_INTERVAL_MS", "25")
	t.Setenv("UART_TIMEOUT_SECONDS", "3.5")
	t.Setenv("TIME_OFFSET_HOURS", "2")
	t.Setenv("LOG_FILE_PATH", "/tmp/custom.log")
	t.Setenv("LOG_MAX_BYTES", "2048")
	t.Setenv("LOG_ROTATE_COUNT", "3")

	cfg := LoadAppConfig()
	if cfg.BroadcastInterval != 25*time.Millisecond {
		t.Fatalf("unexpected broadcast interval: %v", cfg.BroadcastInterval)
	}
	if cfg.UARTTimeout != 3500*time.Millisecond {
		t.Fatalf("unexpected uart timeout: %v", cfg.UARTTimeout)
	}
	if cfg.TimeOffset != 2*time.Hour {
		t.Fatalf("unexpected time offset: %v", cfg.TimeOffset)
	}
	if cfg.LogPath != "/tmp/custom.log" {
		t.Fatalf("unexpected log path: %v", cfg.LogPath)
	}
	if cfg.LogMaxBytes != 2048 {
		t.Fatalf("unexpected log max bytes: %d", cfg.LogMaxBytes)
	}
	if cfg.LogRotateCount != 3 {
		t.Fatalf("unexpected log rotate count: %d", cfg.LogRotateCount)
	}
}
