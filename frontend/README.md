# Frontend (React + Vite + Bun)

Dieses Frontend läuft als SPA mit React und Vite. Paketmanagement, Build und Start erfolgen über Bun.

## Stack

- React
- Vite
- Bun
- TypeScript
- Tailwind CSS

## Lokale Entwicklung

```bash
bun install
bun run dev
```

Dev-URL: `http://localhost:5173`

## Production Build

```bash
bun run build
bun run start
```

Runtime-URL: `http://localhost:3000`

## Docker

```bash
docker compose up -d --build frontend
```

Das Docker-Image verwendet `oven/bun` und startet den statischen Build mit `sirv-cli` über Bun.
