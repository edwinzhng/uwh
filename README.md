# Underwater Hockey

A modern full-stack monorepo built with Bun, React, Radix UI, Jotai, and Hono, designed for separate deployment of frontend and backend.

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **Radix UI** - Accessible component primitives
- **Jotai** - Atomic state management
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type safety

### Backend
- **Hono** - Fast, lightweight web framework
- **Bun** - Fast JavaScript runtime and package manager
- **TypeScript** - Type safety

## Project Structure

```
uwh/
├── frontend/              # Next.js frontend
│   ├── app/              # Next.js app directory
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions and state
│   ├── package.json      # Frontend dependencies
│   └── tsconfig.json     # Frontend TypeScript config
├── api/                   # Hono backend
│   ├── index.ts          # Main backend entry point
│   ├── package.json      # Backend dependencies
│   └── vercel.json       # Vercel deployment config
├── package.json          # Root monorepo configuration
└── README.md             # This file
```

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) installed globally
- Node.js 18+ (for Next.js compatibility)

### Installation

1. Install all dependencies (root, frontend, and backend):
```bash
bun run install:all
```

2. Start both development servers:
```bash
bun run dev
```

This will start both the frontend (http://localhost:3100) and backend (http://localhost:3101) concurrently.

### Individual Development

- Frontend only: `bun run dev:frontend`
- Backend only: `bun run dev:backend`

### Working with Individual Packages

You can also work directly in each package:

**Frontend:**
```bash
cd frontend
bun install
bun run dev
```

**Backend:**
```bash
cd api
bun install
bun run dev
```

## Deployment

### Frontend Deployment (Vercel)

1. Connect your repository to Vercel
2. Set the root directory to the project root
3. Build command: `bun run build:frontend`
4. Output directory: `.next`

### Backend Deployment (Vercel)

1. Create a new Vercel project for the backend
2. Set the root directory to `api/`
3. Build command: `bun run build`
4. Output directory: `dist`

### Environment Variables

For production, set these environment variables:

**Frontend:**
- `NEXT_PUBLIC_API_URL` - Backend API URL

**Backend:**
- `NODE_ENV` - Set to "production"
- `CORS_ORIGIN` - Frontend domain for CORS

## Features

- ✅ **Separate Deployments** - Frontend and backend can be deployed independently
- ✅ **Modern UI** - Radix UI components with Tailwind CSS
- ✅ **State Management** - Jotai for atomic state management
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Fast Runtime** - Bun for both development and production
- ✅ **API Integration** - Hono backend with CORS support
- ✅ **Responsive Design** - Mobile-first responsive layout

## API Endpoints

- `GET /health` - Health check
- `GET /api/hello` - Test endpoint
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user

## Development

### Adding New Components

1. Create components in `components/ui/`
2. Use Radix UI primitives as base
3. Style with Tailwind CSS
4. Export from the component file

### Adding New API Routes

1. Add routes in `api/index.ts`
2. Use Hono's routing syntax
3. Add proper error handling
4. Update TypeScript types as needed

### State Management

1. Define atoms in `lib/atoms.ts`
2. Use `useAtom` hook in components
3. Create derived atoms for computed values
4. Use the API client for server state

## Scripts

- `bun run dev` - Start both frontend and backend
- `bun run build` - Build both frontend and backend
- `bun run dev:frontend` - Start only frontend
- `bun run dev:backend` - Start only backend
- `bun run build:frontend` - Build only frontend
- `bun run build:backend` - Build only backend

## License

MIT