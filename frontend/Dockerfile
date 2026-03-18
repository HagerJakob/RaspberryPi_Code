FROM oven/bun:1.2-alpine
WORKDIR /app
COPY package.json bun.lock* package-lock.json* ./
RUN bun install
COPY . .
EXPOSE 3000
RUN bun run build
CMD ["bun", "run", "start"]
