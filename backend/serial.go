package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"periph.io/x/conn/v3"
	"periph.io/x/conn/v3/physic"
	"periph.io/x/conn/v3/uart"
	"periph.io/x/conn/v3/uart/uartreg"
	"periph.io/x/host/v3"
	_ "periph.io/x/host/v3/serial"
)

type SerialService struct {
	ports    []string
	baudRate int
}

func NewSerialService() *SerialService {
	ports := defaultSerialPorts
	if raw := os.Getenv("SERIAL_PORTS"); raw != "" {
		parts := strings.Split(raw, ",")
		custom := make([]string, 0, len(parts))
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				custom = append(custom, trimmed)
			}
		}
		if len(custom) > 0 {
			ports = custom
		}
	}
	return &SerialService{
		ports:    ports,
		baudRate: defaultBaudRate,
	}
}

func (s *SerialService) Start(ctx context.Context, out chan<- SerialFrame) {
	go func() {
		defer close(out)

		if _, err := host.Init(); err != nil {
			log.Printf("serial: periph host init failed (%v)", err)
		}
		for {
			if ctx.Err() != nil {
				return
			}

			port, serialConn, portName, err := s.openFirstAvailablePort()
			if err != nil {
				log.Printf("serial: no port available (%v), retrying", err)
				select {
				case <-ctx.Done():
					return
				case <-time.After(2 * time.Second):
				}
				continue
			}

			log.Printf("serial: connected %s @ %d", portName, s.baudRate)
			done := make(chan struct{})
			go func(p uart.PortCloser) {
				select {
				case <-ctx.Done():
					_ = p.Close()
				case <-done:
				}
			}(port)

			s.consumePort(ctx, serialConn, out)
			close(done)
			_ = port.Close()
			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Second):
			}
		}
	}()
}

func (s *SerialService) Candidates() []string {
	candidates := make([]string, 0, len(s.ports)+1)
	candidates = append(candidates, s.ports...)
	candidates = append(candidates, "")

	if refs := uartreg.All(); len(refs) > 0 {
		for _, ref := range refs {
			candidates = append(candidates, ref.Name)
		}
	}

	return uniqueStrings(candidates)
}

func (s *SerialService) openFirstAvailablePort() (uart.PortCloser, conn.Conn, string, error) {
	freq := physic.Frequency(s.baudRate) * physic.Hertz
	for _, candidate := range s.Candidates() {
		port, err := uartreg.Open(candidate)
		if err != nil {
			continue
		}

		connHandle, err := port.Connect(freq, uart.One, uart.NoParity, uart.NoFlow, 8)
		if err != nil {
			_ = port.Close()
			continue
		}

		openedName := candidate
		if openedName == "" {
			openedName = port.String()
		}
		return port, connHandle, openedName, nil
	}

	return nil, nil, "", fmt.Errorf("none of configured UART ports could be opened via periph")
}

func (s *SerialService) consumePort(ctx context.Context, serialConn conn.Conn, out chan<- SerialFrame) {
	reader, ok := serialConn.(io.Reader)
	if !ok {
		log.Printf("serial: connection does not implement io.Reader")
		return
	}

	buffer := ""
	bytes := make([]byte, 256)

	for {
		if ctx.Err() != nil {
			return
		}
		count, err := reader.Read(bytes)
		if err != nil {
			log.Printf("serial: read failed (%v)", err)
			return
		}
		if count == 0 {
			continue
		}
		buffer += string(bytes[:count])
		for {
			idx := strings.IndexByte(buffer, '/')
			if idx < 0 {
				break
			}
			frame := strings.TrimSpace(buffer[:idx])
			buffer = buffer[idx+1:]
			if frame == "" {
				continue
			}
			parsed, ok := parseFrame(frame)
			if !ok {
				continue
			}
			select {
			case <-ctx.Done():
				return
			case out <- parsed:
			}
		}
	}
}

func uniqueStrings(values []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func parseFrame(raw string) (SerialFrame, bool) {
	if raw == "NO_DATA" {
		return SerialFrame{Connected: false, Received: time.Now()}, true
	}

	parts := strings.Split(raw, ":")
	if len(parts) != 3 {
		return SerialFrame{}, false
	}
	rpm, err := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	if err != nil {
		return SerialFrame{}, false
	}
	speed, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	if err != nil {
		return SerialFrame{}, false
	}
	coolant, err := strconv.ParseFloat(strings.TrimSpace(parts[2]), 64)
	if err != nil {
		return SerialFrame{}, false
	}

	return SerialFrame{
		RPM:       rpm,
		Speed:     speed,
		Coolant:   coolant,
		Connected: true,
		Received:  time.Now(),
	}, true
}
