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

### Phase 1: Project Setup and Structure
1. Initialize Wails project in backend directory
2. Set up Go module structure
3. Configure Wails application with existing frontend
4. Establish basic application lifecycle

### Phase 2: Serial Communication Migration
1. Replace Python `serial` with `periph.io` serial implementation
2. Implement UART port detection and connection logic
3. Handle OBD data parsing and validation
4. Ensure compatibility with existing serial protocols

### Phase 3: Data Aggregation Port
1. Convert `DataAggregator` class to Go struct/methods
2. Implement 1-second and 10-second aggregation windows
3. Handle concurrent data access safely
4. Maintain data structure compatibility with frontend

### Phase 4: WebSocket to Wails Events
1. Replace FastAPI WebSocket endpoints with Wails runtime events
2. Implement real-time data broadcasting to frontend
3. Handle client connection management
4. Ensure 60 FPS update rate (16ms intervals)

### Phase 5: Logging and File Operations
1. Implement JSON-based logging system
2. Handle async file operations safely
3. Maintain log file structure compatibility
4. Add log rotation if needed

### Phase 6: Frontend Integration
1. Adapt frontend to work within Wails application
2. Update API calls to use Wails bindings
3. Ensure WebSocket replacement works correctly
4. Test UI responsiveness and data display

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
