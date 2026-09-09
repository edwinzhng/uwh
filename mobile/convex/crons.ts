import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval(
	"Expire security records",
	{ hours: 1 },
	internal.security_cleanup.expire,
);
export default crons;
