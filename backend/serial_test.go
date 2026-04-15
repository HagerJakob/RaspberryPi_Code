package main

import "testing"

func TestParseFrameValid(t *testing.T) {
	frame, ok := parseFrame("2500:45:85.5")
	if !ok {
		t.Fatalf("expected valid frame")
	}
	if !frame.Connected {
		t.Fatalf("expected connected frame")
	}
	if frame.RPM != 2500 || frame.Speed != 45 || frame.Coolant != 85.5 {
		t.Fatalf("unexpected values: %+v", frame)
	}
}

func TestParseFrameNoData(t *testing.T) {
	frame, ok := parseFrame("NO_DATA")
	if !ok {
		t.Fatalf("expected NO_DATA to be accepted")
	}
	if frame.Connected {
		t.Fatalf("expected disconnected frame")
	}
}

func TestParseFrameInvalid(t *testing.T) {
	cases := []string{"", "abc", "100:200", "100:a:40", "100:30:40:50"}
	for _, value := range cases {
		if _, ok := parseFrame(value); ok {
			t.Fatalf("expected invalid frame for %q", value)
		}
	}
}

func TestSerialCandidatesFromEnv(t *testing.T) {
	t.Setenv("SERIAL_PORTS", "/dev/ttyS0, /dev/ttyAMA0, /dev/ttyS0")
	svc := NewSerialService()
	ports := svc.Candidates()

	if len(ports) < 3 {
		t.Fatalf("expected configured ports plus default candidate, got %d", len(ports))
	}
	if ports[0] != "/dev/ttyS0" || ports[1] != "/dev/ttyAMA0" {
		t.Fatalf("unexpected configured port order: %+v", ports)
	}
	if ports[2] != "" {
		t.Fatalf("expected autodetect candidate as empty string at index 2, got %q", ports[2])
	}
}
