# Underwater Hockey

Web app for the Calgary Underwater Hockey Club, built on Convex and Next.js.

## Tech Stack

### Frontend
- Next.js, Radix UI, Tailwind, Jotai

### Backend
- Convex

### Tooling
- Biome, Bun

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) installed globally
- Node.js 18+ (for Next.js compatibility)

### Installation

1. **Set up environment variables:**

```bash
cd api
cp env.example .env.local
```

2. **Install dependencies:**
```bash
cd ..
bun install
```

3. **Start development servers:**
```bash
bun dev
```

This will start both the Next.js frontend (http://localhost:3000) and Convex backend (http://localhost:3210) concurrently.

## License

MIT
