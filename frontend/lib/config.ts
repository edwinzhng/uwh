export const API_BASE_URL =
	process.env.NODE_ENV === "production"
		? "https://uwh-api.up.railway.app"
		: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3101";
