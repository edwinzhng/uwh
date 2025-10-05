import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";

// Database configuration
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("Missing DATABASE_URL environment variable.");
}

// Initialize database connection
export const db = drizzle(connectionString);

