import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "2-digit",
		year: "numeric",
	});
}

export function formatDateShort(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function formatDayTime(dateStr: string): string {
	const date = new Date(dateStr);
	const day = date.toLocaleDateString("en-US", { weekday: "short" });
	const time = date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
	return `${day} · ${time}`;
}

export function formatMonthDay(dateStr: string): string {
	const date = new Date(dateStr);
	return date
		.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
		.toUpperCase();
}

export function getPracticeTitle(practice: {
	date: string;
	notes?: string | null;
}): string {
	if (practice.notes) {
		const parts = practice.notes.split("·");
		return parts[0].trim();
	}

	const d = new Date(practice.date);
	const day = d.getDay();
	// 0=Sun, 1=Mon, 6=Sat
	if (day === 6) return "Saturday Outdoor Practice";
	if (day === 3) return "Wednesday Outdoor Practice";
	return "Practice";
}

export function getPracticeLocation(): string {
	return "MNP Community & Sport Centre";
}

export function formatHours(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (m === 0) return `${h}.0`;
	return `${h}.${m}`;
}

export function getSeasonLabel(start: string, end: string): string {
	const s = new Date(start);
	const e = new Date(end);
	const sy = s.toLocaleDateString("en-US", { month: "short", year: "numeric" });
	const ey = e.toLocaleDateString("en-US", { month: "short", year: "numeric" });
	return `${sy} – ${ey}`;
}
