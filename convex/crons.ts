import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send reminders every day at 12pm MST
crons.daily(
	"Send hockey practice reminders",
	{ hourUTC: 18, minuteUTC: 0 }, // Noon MST (UTC-6) is 18:00 UTC
	internal.reminders.sendHockeyReminders,
);

export default crons;
