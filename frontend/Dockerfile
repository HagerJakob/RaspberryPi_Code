FROM oven/bun:1.2-alpine

WORKDIR /app

COPY package.json bun.lock* package-lock.json* ./
RUN bun install

COPY . .

EXPOSE 5173

CMD ["bun", "run", "dev"]
