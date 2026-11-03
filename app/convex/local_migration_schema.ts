import { defineTable } from "convex/server";
import { v } from "convex/values";
import { coachingHoursTables } from "./coaching_hours_schema";
import { developmentTables } from "./development_schema";
import { fitnessTables } from "./fitness_schema";
import { memberProfileTables } from "./member_profiles_schema";
import { playerCoachingTables } from "./player_coaching_schema";
import { resourceTables } from "./resources_schema";
import { seasonTables } from "./season_schema";
import { sessionCheckinTables } from "./session_checkins_schema";
import { sessionPerformanceTables } from "./session_performance_schema";
import { sessionPlanTables } from "./session_plans_schema";
import {
	conversationsValue,
	eventsValue,
	feedbackValue,
	membersValue,
	messagesValue,
	noticesValue,
	responsesValue,
	teamsValue,
} from "./validators";

const optionalClub = { clubId: v.optional(v.id("clubs")) };

export const localMigrationRecord = v.union(
	v.object({
		kind: v.literal("actors"),
		value: v.object({ personId: v.string(), name: v.string() }),
	}),
	v.object({ kind: v.literal("members"), value: membersValue }),
	v.object({ kind: v.literal("events"), value: eventsValue }),
	v.object({ kind: v.literal("responses"), value: responsesValue }),
	v.object({ kind: v.literal("teams"), value: teamsValue }),
	v.object({ kind: v.literal("feedback"), value: feedbackValue }),
	v.object({ kind: v.literal("conversations"), value: conversationsValue }),
	v.object({ kind: v.literal("messages"), value: messagesValue }),
	v.object({ kind: v.literal("notices"), value: noticesValue }),
	v.object({
		kind: v.literal("images"),
		value: v.object({
			...optionalClub,
			threadId: v.string(),
			ownerId: v.id("users"),
			storageId: v.id("_storage"),
			name: v.string(),
			mime: v.string(),
			size: v.number(),
			messageId: v.optional(v.string()),
		}),
	}),
	v.object({
		kind: v.literal("memberProfilePhotos"),
		value: v.object({
			...memberProfileTables.memberProfilePhotos.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("memberProfiles"),
		value: v.object({
			...memberProfileTables.memberProfiles.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("playerCoaching"),
		value: v.object({
			...playerCoachingTables.playerCoaching.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("seasonRecords"),
		value: v.object({
			...seasonTables.seasonRecords.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("developmentReviews"),
		value: v.object({
			...developmentTables.developmentReviews.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("developmentRounds"),
		value: v.object({
			...developmentTables.developmentRounds.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("goalReflections"),
		value: v.object({
			...developmentTables.goalReflections.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("sessionPerformance"),
		value: v.object({
			...sessionPerformanceTables.sessionPerformance.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("sessionCheckins"),
		value: v.object({
			...sessionCheckinTables.sessionCheckins.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("sessionPlans"),
		value: v.object({
			...sessionPlanTables.sessionPlans.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("coachingHours"),
		value: v.object({
			...coachingHoursTables.coachingHours.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("fitnessTests"),
		value: v.object({
			...fitnessTables.fitnessTests.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("fitnessSessions"),
		value: v.object({
			...fitnessTables.fitnessSessions.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("fitnessResults"),
		value: v.object({
			...fitnessTables.fitnessResults.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("resources"),
		value: v.object({
			...resourceTables.resources.validator.fields,
			...optionalClub,
		}),
	}),
	v.object({
		kind: v.literal("resourceFiles"),
		value: v.object({
			...resourceTables.resourceFiles.validator.fields,
			...optionalClub,
		}),
	}),
);

export const localMigrationTables = {
	migrationReferences: defineTable({
		clubId: v.id("clubs"),
		key: v.string(),
		sourceId: v.string(),
		kind: v.string(),
		fingerprint: v.string(),
		targetId: v.string(),
		createdAt: v.number(),
	})
		.index("by_club_key", ["clubId", "key"])
		.index("by_club", ["clubId"]),
	migrationArchive: defineTable({
		clubId: v.id("clubs"),
		key: v.string(),
		source: v.string(),
		entity: v.string(),
		payload: v.string(),
		fingerprint: v.string(),
		disposition: v.string(),
		createdAt: v.number(),
	})
		.index("by_club_key", ["clubId", "key"])
		.index("by_club", ["clubId"]),
};
