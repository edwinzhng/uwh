import { v } from "convex/values";
import type { Member } from "../src/domain/app-types";
import { directThreadKey } from "../src/domain/messaging";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";

const fixtureArgs = { clubId: v.id("clubs"), userId: v.id("users") };
const requireFixture = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	userId: Id<"users">,
): Promise<void> => {
	const [club, user] = await Promise.all([
		ctx.db.get(clubId),
		ctx.db.get(userId),
	]);
	requireLocalEmail(user?.email ?? "");
	if (
		!user?.email?.startsWith("member-merges-") ||
		club?.ownerId !== userId ||
		club.name !== "Member merge verification" ||
		process.env.PUSH_DELIVERY_ENABLED === "true"
	)
		throw new Error("Isolated fictional merge fixture required.");
};
const caseValue = v.union(
	v.literal("compatible"),
	v.literal("attendance"),
	v.literal("lineup"),
	v.literal("checkin"),
	v.literal("fitness"),
	v.literal("enrollment"),
	v.literal("invite"),
	v.literal("round"),
);
export const seed = internalMutation({
	args: { ...fixtureArgs, kind: caseValue },
	handler: async (ctx, { clubId, userId, kind }): Promise<void> => {
		await requireFixture(ctx, clubId, userId);
		const sourceId = "merge-source";
		const targetId = "merge-target";
		const old = {
			id: "merge-past",
			title: "Historical practice",
			date: "2025-09-01",
			start: "19:00",
			end: "20:00",
			venue: "Fictional pool",
			program: "club",
			kind: "hockey" as const,
			signup: "closed" as const,
			description: "",
			cancelled: false,
		};
		await ctx.db.insert("events", { clubId, value: old });
		await ctx.db.insert("events", {
			clubId,
			value: {
				...old,
				id: "merge-future",
				date: "2099-09-01",
				title: "Future practice",
			},
		});
		await ctx.db.insert("responses", {
			clubId,
			value: {
				id: `${old.id}:${sourceId}`,
				eventId: old.id,
				personId: sourceId,
				response: "going",
				attendance: "present",
			},
		});
		if (kind === "attendance")
			await ctx.db.insert("responses", {
				clubId,
				value: {
					id: `${old.id}:${targetId}`,
					eventId: old.id,
					personId: targetId,
					response: "going",
					attendance: "late",
				},
			});
		for (const eventId of [old.id, "merge-future"])
			await ctx.db.insert("teams", {
				clubId,
				value: {
					id: eventId,
					eventId,
					black: [sourceId],
					white: [],
					attendees: [sourceId],
					fieldSlots: [{ personId: sourceId, slot: 0 }],
					assignments: [
						{ personId: sourceId, position: "FORWARD", ageGroup: "adult" },
					],
					referees:
						kind === "lineup" ? [{ side: "white", personId: targetId }] : [],
					published: true,
					coachingStale: false,
					revision: 4,
				},
			});
		await ctx.db.insert("teams", {
			clubId,
			value: {
				id: "merge-future:refs",
				eventId: "merge-future",
				partId: "refs",
				black: [],
				white: [],
				attendees: [],
				referees: [{ side: "black", personId: sourceId }],
				published: true,
				revision: 4,
			},
		});
		await ctx.db.insert("sessionCheckins", {
			clubId,
			eventId: old.id,
			personId: sourceId,
			energy: 3,
			note: "Original private energy note",
			actorId: userId,
			updatedAt: 42,
		});
		if (kind === "checkin")
			await ctx.db.insert("sessionCheckins", {
				clubId,
				eventId: old.id,
				personId: targetId,
				energy: 4,
				note: "Other private note",
				actorId: userId,
				updatedAt: 43,
			});
		await ctx.db.insert("sessionSeries", {
			clubId,
			id: "merge-series",
			seriesIds: ["merge-series"],
			title: "Historical commitments",
			waitlist: false,
			enrollments: [
				{
					personId: sourceId,
					start: "2025-09-01",
					end: "2025-10-01",
					state: "committed",
				},
				{
					personId: sourceId,
					start: "2025-10-01",
					end: "2025-10-01",
					state: "committed",
				},
				{
					personId: targetId,
					start: kind === "enrollment" ? "2025-09-15" : "2025-10-01",
					end: "2025-11-01",
					state: "committed",
				},
			],
		});
		const testId = await ctx.db.insert("fitnessTests", {
			clubId,
			name: "Fictional lengths",
			unit: "count",
			archived: false,
			revision: 1,
		});
		for (const [index, personId] of [sourceId, targetId].entries()) {
			const date = `2025-09-0${index + 1}`;
			const sessionId = await ctx.db.insert("fitnessSessions", {
				clubId,
				testId,
				seasonId: "2025-2026",
				date,
				notes: "Original fitness session",
				revision: 2,
				resultCount: 1,
			});
			await ctx.db.insert("fitnessResults", {
				clubId,
				testId,
				sessionId,
				personId,
				seasonId: "2025-2026",
				date,
				value: 10 + index * 5,
				notes: `Original result ${personId}`,
			});
			await ctx.db.insert("fitnessStats", {
				clubId,
				testId,
				personId,
				seasonId: "2025-2026",
				count: 1,
				total: 10 + index * 5,
				best: 10 + index * 5,
			});
			if (kind === "fitness" && personId === sourceId)
				await ctx.db.insert("fitnessResults", {
					clubId,
					testId,
					sessionId,
					personId: targetId,
					seasonId: "2025-2026",
					date,
					value: 18,
					notes: "Conflicting result",
				});
		}
		await ctx.db.insert("feedback", {
			clubId,
			value: {
				id: "merge-feedback",
				personId: sourceId,
				authorId: userId,
				body: "Original private coaching observation",
				visibility: "private",
				kind: "coaching",
				date: "2025-09-01",
			},
		});
		await ctx.db.insert("goalReflections", {
			clubId,
			personId: sourceId,
			authorId: userId,
			requestId: "merge-reflection",
			goal: "Original goal",
			note: "Original self reflection",
			selfRating: 3,
			createdAt: 42,
			checkIn: 2,
		});
		for (const personId of kind === "round"
			? [sourceId]
			: [sourceId, targetId]) {
			await ctx.db.insert("developmentRounds", {
				clubId,
				personId,
				round: 1,
				revision: 2,
				status: "open",
				requiredCoachIds: [userId],
				profileRevision: 0,
				updatedAt: 42,
			});
			await ctx.db.insert("developmentReviews", {
				clubId,
				personId,
				round: 1,
				coachId: userId,
				revision: 2,
				status: "submitted",
				rating: 50,
				observation: `Original ${personId} observation`,
				updatedAt: 42,
			});
		}
		await ctx.db.insert("seasonRecords", {
			clubId,
			personId: sourceId,
			seasonId: "2025-2026",
			registration: "approved",
			cuga: true,
			due: 100,
			paid: 50,
			revision: 2,
		});
		await ctx.db.insert("seasonLedger", {
			clubId,
			personId: sourceId,
			seasonId: "2025-2026",
			key: "merge-ledger",
			kind: "payment",
			amount: 50,
			note: "Original ledger note",
			date: "2025-09-01",
			actor: "Fictional coach",
			actorId: userId,
			createdAt: 42,
			before: "original before snapshot",
			after: "original after snapshot",
		});
		await ctx.db.insert("payments", {
			clubId,
			value: {
				id: "merge-payment",
				personId: sourceId,
				amount: 50,
				note: "Original payment",
			},
		});
		const charge = await ctx.db
			.query("charges")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", sourceId),
			)
			.unique();
		if (charge)
			await ctx.db.patch(charge._id, {
				value: { ...charge.value, amount: 100 },
				paidTotal: 50,
			});
		await ctx.db.insert("equipment", {
			clubId,
			value: {
				id: "merge-kit",
				name: "Fictional kit",
				size: "M",
				condition: "ready",
			},
		});
		await ctx.db.insert("loans", {
			clubId,
			value: {
				id: "merge-loan",
				itemId: "merge-kit",
				personId: sourceId,
				due: "2025-10-01",
				returned: true,
			},
		});
		await ctx.db.insert("trackers", {
			clubId,
			value: {
				id: "merge-tracker",
				name: "Historical tracker",
				kind: "text",
				program: "all",
			},
		});
		for (const personId of [sourceId, targetId])
			await ctx.db.insert("trackerValues", {
				clubId,
				value: {
					id: `merge-tracker:${personId}`,
					value: "Original agreed value",
				},
			});
		await ctx.db.insert("eventAttendanceFlags", {
			clubId,
			eventId: old.id,
			personId: sourceId,
			kind: "addition",
		});
		for (const record of [
			{ kind: "members" as const, targetId: sourceId },
			{ kind: "attendance" as const, targetId: `${old.id}:${sourceId}` },
			{ kind: "registration" as const, targetId: `2025-2026:${sourceId}` },
		])
			await ctx.db.insert("importReferences", {
				clubId,
				source: "fictional",
				sourceId: record.kind,
				personId: sourceId,
				seasonId: record.kind === "registration" ? "2025-2026" : undefined,
				fingerprint: "Original import fingerprint",
				...record,
			});
		await ctx.db.insert("coachingHours", {
			clubId,
			personId: sourceId,
			coachId: userId,
			name: "Original coach name",
			eventId: old.id,
			durationMinutes: 60,
		});
		await ctx.db.insert("conversations", {
			clubId,
			pendingPersonId: sourceId,
			recipientPersonId: sourceId,
			directKey: directThreadKey(userId, `person:${sourceId}`),
			value: {
				id: "merge-conversation",
				title: "Original direct conversation",
				subtitle: "Direct message",
				kind: "direct",
				accountIds: [userId],
				participantPersonIds: [sourceId],
			},
		});
		await ctx.db.insert("calendarFeeds", {
			clubId,
			userId,
			personId: sourceId,
			token: "fictional-merge-calendar-token",
			includeWaitlisted: false,
		});
		await ctx.db.insert("clubInvites", {
			clubId,
			personId: sourceId,
			email: "member-merges-invite@example.test",
			createdBy: userId,
			revision: 1,
			expiresAt: Date.now() + 600000,
			lastSentAt: 42,
			state: kind === "invite" ? "pending" : "accepted",
			delivery: "local",
			acceptedBy: kind === "invite" ? undefined : userId,
			siteUrl: "http://127.0.0.1:3211",
		});
		for (const personId of [sourceId, targetId])
			await ctx.db.insert("memberProfiles", {
				clubId,
				personId,
				email:
					personId === sourceId ? "source@example.test" : "target@example.test",
				phone: personId === sourceId ? "+1 403 555 0100" : "",
				capNumber: personId === sourceId ? 7 : undefined,
				revision: 2,
				lastKey: "original-key",
				lastActorId: userId,
				lastPayload: "original payload",
				updatedAt: 42,
			});
	},
});

export type MergeInspection = {
	members: Member[];
	responses: Doc<"responses">[];
	teams: Doc<"teams">[];
	checkins: Doc<"sessionCheckins">[];
	series: Doc<"sessionSeries">[];
	results: Doc<"fitnessResults">[];
	sessions: Doc<"fitnessSessions">[];
	stats: Doc<"fitnessStats">[];
	rounds: Doc<"developmentRounds">[];
	reviews: Doc<"developmentReviews">[];
	audits: Doc<"memberMerges">[];
	reflections: Doc<"goalReflections">[];
	ledger: Doc<"seasonLedger">[];
	references: Doc<"importReferences">[];
	profiles: Doc<"memberProfiles">[];
	conversations: Doc<"conversations">[];
	memberships: Doc<"memberships">[];
};
export const inspect = internalQuery({
	args: fixtureArgs,
	handler: async (ctx, { clubId, userId }): Promise<MergeInspection> => {
		await requireFixture(ctx, clubId, userId);
		const [
			members,
			responses,
			teams,
			checkins,
			series,
			results,
			sessions,
			stats,
			rounds,
			reviews,
			audits,
			reflections,
			ledger,
			references,
			profiles,
			conversations,
			memberships,
		] = await Promise.all([
			ctx.db
				.query("members")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("responses")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("teams")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("sessionCheckins")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("sessionSeries")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("fitnessResults")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("fitnessSessions")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("fitnessStats")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("developmentRounds")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("developmentReviews")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("memberMerges")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("goalReflections")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("seasonLedger")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("importReferences")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("memberProfiles")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("conversations")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
			ctx.db
				.query("memberships")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect(),
		]);
		return {
			members: members.map((row) => row.value),
			responses,
			teams,
			checkins,
			series,
			results,
			sessions,
			stats,
			rounds,
			reviews,
			audits,
			reflections,
			ledger,
			references,
			profiles,
			conversations,
			memberships,
		};
	},
});
