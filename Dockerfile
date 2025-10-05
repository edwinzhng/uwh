# Build stage
FROM oven/bun:1 AS builder

WORKDIR /api

# Copy package files first for better caching
COPY package.json bun.lock ./
COPY api/package.json ./api/package.json
COPY frontend/package.json ./frontend/package.json

RUN bun install --frozen-lockfile

# Copy rest of the files
COPY . ./

# Build the binary
RUN bun build index.ts --compile --outfile dist/index.js

# Final stage
FROM debian:bookworm-slim

WORKDIR /api

# Copy only the compiled binary
COPY --from=builder /api/dist ./dist

# Run the binary
CMD ["./dist/index.js"]
