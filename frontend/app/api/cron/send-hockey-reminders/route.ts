import { NextResponse } from "next/server";

const API_BASE_URL =
	process.env.NODE_ENV === "production"
		? "https://uwh-api.up.railway.app"
		: "http://localhost:3101";

export async function GET() {
	try {
		// Call the backend cron endpoint
		const response = await fetch(
			`${API_BASE_URL}/api/cron/send-hockey-reminders`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Backend responded with ${response.status}`);
		}

		const result = await response.json();
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error calling backend cron:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to trigger hockey reminders" },
			{ status: 500 },
		);
	}
}

