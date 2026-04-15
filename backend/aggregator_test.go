package main

import (
	"testing"
	"time"
)

func TestAggregatorAverages(t *testing.T) {
	agg := NewDataAggregator()
	now := time.Now()

	rpmA := 1000.0
	speedA := 40.0
	coolA := 80.0
	rpmB := 2000.0
	speedB := 60.0
	coolB := 90.0

	agg.AddData(RawDataPoint{Timestamp: now.Add(-500 * time.Millisecond), RPM: &rpmA, Speed: &speedA, CoolantTemp: &coolA})
	agg.AddData(RawDataPoint{Timestamp: now.Add(-200 * time.Millisecond), RPM: &rpmB, Speed: &speedB, CoolantTemp: &coolB})

	avg1 := agg.OneSecAverage()
	if avg1["rpm"] != 1500 {
		t.Fatalf("unexpected 1s rpm average: %v", avg1["rpm"])
	}
	if avg1["speed"] != 50 {
		t.Fatalf("unexpected 1s speed average: %v", avg1["speed"])
	}

	avg10 := agg.TenSecAverage()
	if avg10["coolant_temp"] != 85 {
		t.Fatalf("unexpected 10s coolant average: %v", avg10["coolant_temp"])
	}
}

func TestAggregatorTrimsOldData(t *testing.T) {
	agg := NewDataAggregator()
	oldRPM := 1200.0
	newRPM := 2200.0

	agg.AddData(RawDataPoint{Timestamp: time.Now().Add(-11 * time.Second), RPM: &oldRPM})
	agg.AddData(RawDataPoint{Timestamp: time.Now(), RPM: &newRPM})

	avg10 := agg.TenSecAverage()
	if _, exists := avg10["coolant_temp"]; exists {
		t.Fatalf("did not expect coolant average without coolant samples")
	}

	avg1 := agg.OneSecAverage()
	if avg1["rpm"] != 2200 {
		t.Fatalf("expected only recent rpm to remain, got %v", avg1["rpm"])
	}
}
