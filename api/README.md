# UWH API

Backend API for Underwater Hockey coaching and player management.

## Setup

### 1. Environment Variables

Copy the example environment file and update with your values:

```bash
cp env.example .env
```

Edit `.env` and add your Supabase database URL:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Generate and Run Migrations

Generate the migration files:

```bash
bun run db:generate
```

Push the schema to your database:

```bash
bun run db:migrate
```

### 4. Start the Development Server

```bash
bun run dev
```

The API will be available at `http://localhost:3101`

## Database Commands

- `bun run db:generate` - Generate migration files from schema
- `bun run db:migrate` - Apply migrations to database
- `bun run db:studio` - Open Drizzle Studio (database GUI)

## API Endpoints

### Players

- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player by ID
- `POST /api/players` - Create new player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player
- `GET /api/players/position/:position` - Get players by position

### Health Check

- `GET /health` - Health check endpoint
- `GET /api/hello` - Test endpoint

## Tech Stack

- **Hono** - Web framework
- **Drizzle ORM** - Type-safe database ORM
- **PostgreSQL** (via Supabase) - Database
- **Bun** - Runtime and package manager

