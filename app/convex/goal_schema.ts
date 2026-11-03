import { v } from "convex/values";
export const goalDetailsValue = v.object({
	category: v.union(
		v.literal("fitness"),
		v.literal("breath-hold"),
		v.literal("stick-skills"),
		v.literal("shooting"),
		v.literal("positioning"),
		v.literal("team-tactics"),
		v.literal("game-awareness"),
		v.literal("communication"),
		v.literal("other"),
	),
	remarks: v.string(),
});
