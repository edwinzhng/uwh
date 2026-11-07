import { v } from "convex/values";
import { ageGroupValue, positionValue } from "./player_coaching_schema";

export const formationValue = v.union(
	v.literal("2-3-1"),
	v.literal("1-3-2"),
	v.literal("3-3"),
);
export const lineupSnapshotValue = v.object({
	excludedPersonIds: v.optional(v.array(v.string())),
	captains: v.optional(
		v.array(
			v.object({
				side: v.union(v.literal("black"), v.literal("white")),
				personId: v.string(),
				role: v.optional(v.literal("vice")),
			}),
		),
	),
	fieldSlots: v.optional(
		v.array(v.object({ personId: v.string(), slot: v.number() })),
	),
	rotationSlots: v.optional(
		v.array(v.object({ personId: v.string(), slot: v.number() })),
	),
	referees: v.optional(
		v.array(
			v.object({
				side: v.union(v.literal("black"), v.literal("white")),
				personId: v.string(),
				role: v.optional(v.literal("second")),
			}),
		),
	),
	black: v.array(v.string()),
	white: v.array(v.string()),
	blackBench: v.array(v.string()),
	whiteBench: v.array(v.string()),
	blackFormation: formationValue,
	whiteFormation: formationValue,
	positions: v.array(
		v.object({
			personId: v.string(),
			position: positionValue,
			ageGroup: v.optional(ageGroupValue),
		}),
	),
});
