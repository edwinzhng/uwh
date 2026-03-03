import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";

export const maxDuration = 60; // Set max duration for the cron job (in seconds)
export const dynamic = "force-dynamic"; // Do not cache this route

export async function GET() {
	try {
		const targetUrl = `${API_BASE_URL}/api/cron/send-hockey-reminders`;

		const response = await fetch(targetUrl, {
			method: "GET",
		});

		const data = await response.json();

		if (!response.ok) {
			console.error(
				`Cron handler received error from backend: ${response.status}`,
				data,
			);
			return NextResponse.json(
				{ error: "Backend failed to process cron job", details: data },
				{ status: response.status },
			);
		}

		console.info("Cron job completed successfully");
		return NextResponse.json(data);
	} catch (error) {
		console.error("Cron handler failed to reach backend:", error);
		return NextResponse.json(
			{ error: "Failed to reach backend", details: String(error) },
			{ status: 500 },
		);
	}
}
