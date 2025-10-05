# SportEasy Integration

This API provides integration with SportEasy to import player profiles.

## Configuration

Add the following environment variable to your `.env` file:

```
SPORTEASY_COOKIE=your_sporteasy_cookie_here
```

To get your SportEasy cookie:
1. Log in to SportEasy in your browser
2. Open Developer Tools (F12)
3. Go to the Network tab
4. Make a request to SportEasy
5. Copy the `Cookie` header value

## API Endpoints

### GET `/api/sporteasy/profiles`
Fetches all profiles from SportEasy team 2307567.

**Response:**
```json
[
  {
    "last_name": "Zhang",
    "first_name": "Edwin",
    "email": "edwinzhang64@gmail.com"
  }
]
```

### GET `/api/sporteasy/profiles/:email`
Fetches a specific profile by email.

**Response:**
```json
{
  "last_name": "Zhang",
  "first_name": "Edwin",
  "email": "edwinzhang64@gmail.com"
}
```

### POST `/api/sporteasy/import`
Imports all players from SportEasy into the database.
- Skips players that already exist (by email)
- Creates new players with default values:
  - Position: FORWARD, WING, CENTER, FULL_BACK
  - Rating: 5
  - Youth: false

**Response:**
```json
{
  "total": 25,
  "imported": 20,
  "skipped": 5,
  "errors": []
}
```

## Configuration Constants

- **Base URL**: `https://api.sporteasy.net/v2.3`
- **Team ID**: `2307567`

These are defined in `api/lib/sporteasy.ts`.

