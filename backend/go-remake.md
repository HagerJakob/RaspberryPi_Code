# Go Remake Plan: Wails Application for Raspberry Pi OBD Dashboard

## Overview

This document outlines the plan to migrate the current Python-based OBD data dashboard from a containerized FastAPI backend to a compiled Go application using the Wails framework. The goal is to reduce memory footprint and eliminate Docker dependencies for production deployment on Raspberry Pi devices while maintaining all current functionalities.

## Current Architecture

### Backend (Python/FastAPI)
- **Web Server**: FastAPI with CORS middleware
- **Real-time Communication**: WebSocket connections for live data streaming
- **Serial Communication**: Python `serial` library for UART OBD data reading
- **Data Processing**: `DataAggregator` class handling sensor data aggregation (1s/10s windows)
- **Logging**: JSON-based text file logging with async file operations
- **Deployment**: Docker containerized

### Frontend (Web-based)
- **Framework**: Vite + TypeScript + React
- **UI Components**: Dashboard with real-time sensor displays
- **Communication**: WebSocket client for backend data
- **Styling**: Custom CSS

## Target Architecture

### Unified Application (Go/Wails)
- **Framework**: Wails v2 (Go backend + web frontend)
- **Backend**: Go application handling all server logic
- **Frontend**: Existing web UI integrated into Wails application
- **Serial Communication**: `periph.io` library for UART/serial operations
- **Real-time Updates**: Wails runtime events for frontend communication
- **Data Processing**: Go equivalent of DataAggregator
- **Logging**: Structured logging with file output
- **Deployment**: Single compiled binary

## Technology Stack

### Core Dependencies
- **Wails**: `github.com/wailsapp/wails/v2`
- **Serial Communication**: `periph.io/x/periph/conn/physic` and `periph.io/x/periph/devices/serial`
- **Web Framework**: Wails built-in web server
- **JSON Handling**: Go standard library
- **File Operations**: Go standard library
- **Logging**: `github.com/sirupsen/logrus` or standard library

### Development Tools
- **Go Version**: 1.21+
- **Wails CLI**: Latest stable version
- **Build Tools**: Standard Go toolchain

## Implementation Phases

### Current Progress (2026-04-13)
- **Overall**: Migration bootstrap is in place. Core backend logic is now available in Go/Wails, while Python/FastAPI remains available as fallback.
- [x] Go module initialized (`go.mod`) with Wails dependency.
- [x] Wails application entry + lifecycle implemented (`main.go`, `app.go`).
- [x] Data model compatibility for dashboard payload fields (`RPM`, `SPEED`, `COOLANT`, `OIL`, `FUEL`, `VOLTAGE`, `BOOST`, `OILPRESS`, `UART_CONNECTED`, `TIME`).
- [x] DataAggregator port completed (1-second and 10-second windows).
- [x] JSON-line log writer/readback port completed (compatible with existing log format).
- [x] Runtime event broadcasting implemented (`obd:data`, 16ms interval target).
- [x] Frontend updated to consume Wails events with automatic WebSocket fallback.
- [x] Frontend log download updated to use Wails binding (`GetLogfileText`) with HTTP fallback.
- [x] Serial migration updated to `periph.io` host/uart registry implementation with OBD frame parser.
- [~] Frontend embed integration started (`sync-frontend.ps1` copies built frontend to `backend/frontend/dist`).
- [x] Backend test coverage started (`aggregator_test.go`, `serial_test.go`, `logging_test.go`).
- [x] Optional log rotation support added via `LOG_MAX_BYTES`.
- [x] Runtime config loader implemented (`BROADCAST_INTERVAL_MS`, `UART_TIMEOUT_SECONDS`, `TIME_OFFSET_HOURS`, `LOG_FILE_PATH`, `LOG_MAX_BYTES`).
- [x] Multi-generation log rotation implemented (`LOG_ROTATE_COUNT`).
- [x] Rotated log readback implemented (APIs now include `.1..N` segments for history continuity).
- [x] Deployment baseline added (`build-rpi.ps1`, `deploy/rpi-obd-dashboard.service`).
- [x] Serial shutdown improved (context cancellation closes UART handle).
- [x] Runtime diagnostic bindings added (`GetRuntimeConfig`, `GetCurrentData`).
- [ ] Add hardware validation on Raspberry Pi (UART behavior, throughput, stability).
- [~] Add Go unit/integration tests for aggregator, logging, serial parsing, and runtime config (core unit tests in place; device/integration tests pending).
- [x] Local Go compile verification completed (`go test ./...` and `go build ./...` pass in `backend`).
- [!] Current local worktree has the full `frontend/` content deleted; frontend integration validation is blocked until those files are restored.

### Phase 1: Project Setup and Structure
Status: **Partially completed**
1. [x] Initialize Wails-style backend entry in backend directory
2. [x] Set up Go module structure
3. [~] Configure Wails application with existing frontend (placeholder embed is active, production frontend bundle wiring pending)
4. [x] Establish basic application lifecycle

### Phase 2: Serial Communication Migration
Status: **In progress**
1. [x] Replace Python `serial` with `periph.io` serial implementation
2. [x] Implement UART port detection and connection logic (`uartreg` + configured candidates)
3. [x] Handle OBD data parsing and basic validation (`rpm:speed:temp/`, `NO_DATA`)
4. [~] Ensure compatibility with existing serial protocols on target hardware (software path complete, hardware validation pending)

### Phase 3: Data Aggregation Port
Status: **Completed (functional)**
1. [x] Convert `DataAggregator` class to Go struct/methods
2. [x] Implement 1-second and 10-second aggregation windows
3. [x] Handle concurrent data access safely (mutex-protected buffer)
4. [x] Maintain data structure compatibility with frontend

### Phase 4: WebSocket to Wails Events
Status: **Mostly completed**
1. [x] Replace FastAPI WebSocket path with Wails runtime events (`obd:data`) in migrated flow
2. [x] Implement real-time data broadcasting to frontend
3. [x] Handle client side by Wails event subscription (with WebSocket fallback for browser/dev mode)
4. [~] Ensure 60 FPS update rate (16ms ticker configured; hardware/runtime verification pending)

### Phase 5: Logging and File Operations
Status: **Mostly completed**
1. [x] Implement JSON-based logging system
2. [x] Handle safe concurrent file operations (mutex serialization)
3. [x] Maintain log file structure compatibility
4. [x] Add basic log rotation support (`LOG_MAX_BYTES`)
5. [x] Add configurable rotation depth (`LOG_ROTATE_COUNT`)
6. [x] Include rotated segments in readback paths (`ReadRecentByType`, `ReadAllText`)

### Phase 6: Frontend Integration
Status: **In progress**
1. [x] Adapt frontend dashboard live data flow for Wails runtime events
2. [~] Update API calls to use Wails bindings (log download is migrated; remaining API calls still mixed/fallback)
3. [x] Ensure WebSocket replacement path works via fallback mode
4. [~] Build sync path for Wails embed added (`sync-frontend.ps1`); full runtime test on target device pending

## Migration Strategy

### Code Organization
```
backend/
├── main.go              # Application entry point
├── app.go               # Wails application setup
├── serial.go            # Serial communication logic
├── aggregator.go        # Data aggregation
├── logging.go           # File logging
├── models.go            # Data structures
└── frontend/            # Embedded web UI
```

### Data Compatibility
- Maintain identical JSON structures for frontend consumption
- Preserve log file format for existing data analysis tools
- Ensure sensor data fields remain consistent

## Testing Strategy

### Unit Testing
- Serial communication reliability
- Data aggregation accuracy
- JSON serialization/deserialization
- File operation safety

### Integration Testing
- End-to-end data flow from serial to frontend
- WebSocket event broadcasting
- Concurrent client handling
- Memory usage monitoring

### Performance Testing
- Memory footprint comparison (Python vs Go)
- CPU usage under load
- Serial data throughput
- UI responsiveness

### Hardware Testing
- Raspberry Pi compatibility
- Serial port availability
- GPIO pin access (if needed)
- Power consumption

## Deployment and Build Process

### Build Configuration
- **Target Platforms**: Linux ARM64 (Raspberry Pi)
- **Build Flags**: Optimize for size and performance
- **Static Linking**: Include all dependencies in binary
- **Cross-Compilation**: Build on development machine for RPi

### Production Deployment
1. **Single Binary**: No external dependencies required
2. **Configuration**: Environment variables or config file
3. **Auto-start**: Systemd service or init script
4. **Logging**: Centralized log management
5. **Updates**: Binary replacement strategy

### Rollback Plan
- Keep Python version as backup
- Quick switch between implementations
- Data compatibility verification

## Success Criteria

### Functional Requirements
- [ ] All sensor data types supported (RPM, speed, temperatures, etc.)
- [ ] Real-time data streaming at 60 FPS
- [ ] Reliable serial communication with OBD devices
- [ ] Data aggregation and logging functionality
- [ ] Web-based dashboard with live updates

### Performance Requirements
- [ ] Memory usage < 50MB (vs current ~200MB with Python + Docker)
- [ ] CPU usage < 5% under normal load
- [ ] Startup time < 5 seconds
- [ ] Zero external dependencies in production

### Compatibility Requirements
- [ ] Raspberry Pi 4/5 compatibility
- [ ] Existing frontend UI works without changes
- [ ] Log file format compatibility
- [ ] Serial protocol compatibility

## Risk Assessment and Mitigation

### Technical Risks
- **Serial Communication**: periph.io may have different behavior than pyserial
  - *Mitigation*: Thorough testing with actual OBD hardware
- **Memory Management**: Go garbage collection vs Python's reference counting
  - *Mitigation*: Profile memory usage during development
- **Wails Integration**: Frontend integration complexity
  - *Mitigation*: Start with minimal Wails app and gradually integrate

### Operational Risks
- **Production Stability**: New binary may have undiscovered bugs
  - *Mitigation*: Extensive testing, phased rollout
- **Performance Regression**: Go version may not meet performance goals
  - *Mitigation*: Performance benchmarking throughout development

---

*This plan will be updated as implementation progresses and new insights are gained.* 
