package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLogWriterAppendAndRead(t *testing.T) {
	t.Setenv("LOG_MAX_BYTES", "")
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "obd.log")

	writer := NewLogWriter(path)
	if err := writer.AppendRecord(map[string]any{"type": "1sec", "rpm": 1234}); err != nil {
		t.Fatalf("append failed: %v", err)
	}
	if err := writer.AppendRecord(map[string]any{"type": "10sec", "coolant_temp": 85.0}); err != nil {
		t.Fatalf("append failed: %v", err)
	}

	items, err := writer.ReadRecentByType("1sec", 10)
	if err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
}

func TestLogWriterRotation(t *testing.T) {
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "obd.log")

	writer := NewLogWriterWithOptions(path, 64, 2)
	for i := 0; i < 8; i++ {
		rec := map[string]any{"type": "1sec", "rpm": i, "geschwindigkeit": i * 2}
		if err := writer.AppendRecord(rec); err != nil {
			t.Fatalf("append failed at %d: %v", i, err)
		}
	}

	if _, err := os.Stat(path + ".1"); err != nil {
		t.Fatalf("expected rotated file to exist: %v", err)
	}
	if _, err := os.Stat(path + ".2"); err != nil {
		t.Fatalf("expected second rotated file to exist: %v", err)
	}
}

func TestReadRecentByTypeIncludesRotatedSegments(t *testing.T) {
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "obd.log")

	writer := NewLogWriterWithOptions(path, 80, 2)
	for i := 0; i < 12; i++ {
		rec := map[string]any{"type": "1sec", "rpm": i}
		if err := writer.AppendRecord(rec); err != nil {
			t.Fatalf("append failed at %d: %v", i, err)
		}
	}

	items, err := writer.ReadRecentByType("1sec", 5)
	if err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if len(items) != 5 {
		t.Fatalf("expected 5 items, got %d", len(items))
	}

	lastRPM, ok := items[len(items)-1]["rpm"].(float64)
	if !ok || int(lastRPM) != 11 {
		t.Fatalf("expected latest rpm 11, got %v", items[len(items)-1]["rpm"])
	}
}

func TestReadAllTextIncludesRotatedSegments(t *testing.T) {
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "obd.log")

	writer := NewLogWriterWithOptions(path, 90, 10)
	for i := 0; i < 10; i++ {
		rec := map[string]any{"type": "1sec", "rpm": i}
		if err := writer.AppendRecord(rec); err != nil {
			t.Fatalf("append failed at %d: %v", i, err)
		}
	}

	if _, err := os.Stat(path + ".1"); err != nil {
		t.Fatalf("expected rotated file to exist: %v", err)
	}

	text, err := writer.ReadAllText()
	if err != nil {
		t.Fatalf("read all text failed: %v", err)
	}
	if !strings.Contains(text, "\"rpm\":0") {
		t.Fatalf("expected earliest rotated entry in text")
	}
	if !strings.Contains(text, "\"rpm\":9") {
		t.Fatalf("expected latest current entry in text")
	}
}
