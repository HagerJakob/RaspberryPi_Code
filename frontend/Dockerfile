FROM node:20-alpine

WORKDIR /app

# Copy only package files first for better layer caching
COPY package-lock.json* package.json ./

# Use npm ci for deterministic, faster installs
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
