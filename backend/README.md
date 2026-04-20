# RaspberryPi OBD Dashboard (Go/Wails)

Go/Wails application for the RaspberryPi OBD Dashboard. Reads OBD data via UART from an ESP32, aggregates it, and streams it to the embedded web frontend using Wails runtime events.

## Architecture

Single compiled binary — Go backend + React frontend embedded via `embed.FS`. No Docker, no separate server process.

```
backend/
├── main.go          # Wails entry point, embed
├── app.go           # Lifecycle, event broadcasting, log/diagnostic bindings
├── serial.go        # UART reader + OBD frame parser (periph.io)
├── aggregator.go    # 1s/10s data aggregation
├── logging.go       # JSON-line log file with rotation
├── models.go        # Shared data types
├── config.go        # Runtime config from env vars
└── frontend/dist/   # Built frontend (copied by sync-frontend.ps1)
```

## Data Payload

The backend emits `obd:data` Wails events at ~60 FPS with:

```json
{
  "RPM": "2500",
  "SPEED": "45",
  "COOLANT": "85.0",
  "OIL": "60",
  "FUEL": "73",
  "VOLTAGE": "12.1",
  "BOOST": "1.1",
  "OILPRESS": "0.3",
  "UART_CONNECTED": true,
  "TIME": "14:30:25"
}
```

## Configuration (Environment Variables)

| Variable | Default | Description |
|---|---|---|
| `BROADCAST_INTERVAL_MS` | `16` | Event broadcast interval (~60 FPS) |
| `UART_TIMEOUT_SECONDS` | `2` | Seconds without data before marking disconnected |
| `TIME_OFFSET_HOURS` | `0` | Clock offset applied to TIME field |
| `LOG_FILE_PATH` | `obd_data_log.txt` | Log file location |
| `LOG_MAX_BYTES` | `0` | Max log size before rotation (0 = no limit) |
| `LOG_ROTATE_COUNT` | `3` | Number of rotated log segments to keep |

## Development

1. Install Go 1.21+ and [Wails CLI](https://wails.io/docs/gettingstarted/installation).
2. Build and sync the frontend:
   ```powershell
   pwsh ./sync-frontend.ps1
   ```
3. Run in dev mode (hot-reload):
   ```bash
   wails dev
   ```

## Build for Raspberry Pi (Linux ARM64)

```powershell
pwsh ./build-rpi.ps1
```

Produces `obd-dashboard-wails` binary for `linux/arm64`.

## Deployment

1. Copy the binary to the Pi:
   ```bash
   scp obd-dashboard-wails pi@raspberrypi:/opt/rpi-obd-dashboard/
   ```
2. Install the systemd service:
   ```bash
   sudo cp deploy/rpi-obd-dashboard.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now rpi-obd-dashboard
   ```

## Exposed Wails Bindings

| Method | Returns | Description |
|---|---|---|
| `GetLogfileText()` | `string` | Full log file content (all rotated segments) |
| `GetLogs1Sec(limit int)` | `[]map` | Recent 1-second averages (RPM, speed) |
| `GetLogs10Sec(limit int)` | `[]map` | Recent 10-second averages (temps, voltage, etc.) |
| `GetHealth()` | `map` | UART connection status |
| `GetRuntimeConfig()` | `map` | Active runtime configuration |
| `GetCurrentData()` | `OBDData` | Latest OBD snapshot |

## Verification

```bash
cd backend
go test ./...
go build ./...
```
