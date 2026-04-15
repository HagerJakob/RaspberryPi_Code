package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"sync"
)

type LogWriter struct {
	path     string
	maxBytes int64
	rotateCount int
	mu       sync.Mutex
}

func NewLogWriter(path string) *LogWriter {
	if path == "" {
		path = defaultLogFilePath
	}

	maxBytes := int64(0)
	if raw := os.Getenv("LOG_MAX_BYTES"); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil && parsed > 0 {
			maxBytes = parsed
		}
	}

	rotateCount := defaultLogRotateCount
	if raw := os.Getenv("LOG_ROTATE_COUNT"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			rotateCount = parsed
		}
	}

	return NewLogWriterWithOptions(path, maxBytes, rotateCount)
}

func NewLogWriterWithOptions(path string, maxBytes int64, rotateCount int) *LogWriter {
	if path == "" {
		path = defaultLogFilePath
	}
	if rotateCount <= 0 {
		rotateCount = defaultLogRotateCount
	}
	return &LogWriter{path: path, maxBytes: maxBytes, rotateCount: rotateCount}
}

func (l *LogWriter) ensureFile() error {
	dir := filepath.Dir(l.path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	f, err := os.OpenFile(l.path, os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		return err
	}
	return f.Close()
}

func (l *LogWriter) AppendRecord(record map[string]any) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if err := l.ensureFile(); err != nil {
		return err
	}

	line, err := json.Marshal(record)
	if err != nil {
		return err
	}
	if err := l.rotateIfNeeded(int64(len(line) + 1)); err != nil {
		return err
	}

	f, err := os.OpenFile(l.path, os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()

	if _, err := f.Write(append(line, '\n')); err != nil {
		return err
	}
	return nil
}

func (l *LogWriter) rotateIfNeeded(incomingBytes int64) error {
	if l.maxBytes <= 0 {
		return nil
	}

	info, err := os.Stat(l.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}

	if info.Size()+incomingBytes <= l.maxBytes {
		return nil
	}

	for i := l.rotateCount; i >= 1; i-- {
		src := l.path
		if i > 1 {
			src = fmt.Sprintf("%s.%d", l.path, i-1)
		}
		dst := fmt.Sprintf("%s.%d", l.path, i)

		if err := os.Remove(dst); err != nil && !errors.Is(err, os.ErrNotExist) {
			return err
		}
		if err := os.Rename(src, dst); err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			return err
		}
	}

	f, err := os.OpenFile(l.path, os.O_CREATE|os.O_TRUNC|os.O_RDWR, 0o644)
	if err != nil {
		return err
	}
	return f.Close()
}

func (l *LogWriter) ReadRecentByType(recordType string, limit int) ([]map[string]any, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if err := l.ensureFile(); err != nil {
		return nil, err
	}

	results := make([]map[string]any, 0, limit)
	for _, path := range l.readPathsOldestToNewest() {
		f, err := os.Open(path)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			return nil, err
		}

		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := scanner.Bytes()
			if len(line) == 0 {
				continue
			}
			item := map[string]any{}
			if err := json.Unmarshal(line, &item); err != nil {
				continue
			}
			t, _ := item["type"].(string)
			if t != recordType {
				continue
			}
			results = append(results, item)
		}
		if err := scanner.Err(); err != nil {
			_ = f.Close()
			return nil, err
		}
		_ = f.Close()
	}
	if limit <= 0 || len(results) <= limit {
		return results, nil
	}
	return results[len(results)-limit:], nil
}

func (l *LogWriter) ReadAllText() (string, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if err := l.ensureFile(); err != nil {
		return "", err
	}

	combined := bytes.Buffer{}
	for _, path := range l.readPathsOldestToNewest() {
		content, err := os.ReadFile(path)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			return "", err
		}
		combined.Write(content)
	}
	return combined.String(), nil
}

func (l *LogWriter) readPathsOldestToNewest() []string {
	paths := make([]string, 0, l.rotateCount+1)
	for i := l.rotateCount; i >= 1; i-- {
		paths = append(paths, fmt.Sprintf("%s.%d", l.path, i))
	}
	paths = append(paths, l.path)
	return paths
}
