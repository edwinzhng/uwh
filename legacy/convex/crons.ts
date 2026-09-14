import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
	"Send hockey practice reminders",
	{ hourUTC: 18, minuteUTC: 0 }, // Noon MST (UTC-6) is 18:00 UTC
	internal.reminders.sendHockeyReminders,
);

export default crons;
