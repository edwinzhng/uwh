import { v } from "convex/values";
import type { ClubEvent } from "../src/domain/app-types";
import {
	type CoachingAssignment,
	maxPracticeCoaches,
} from "../src/domain/coaching-hours";
import {
	changedCoachingPrograms,
	emptyCoachingSchedule,
	programCoachesFor,
	validateCoachingSchedule,
	validateProgramCoaching,
	type WeeklyCoachingSchedule,
} from "../src/domain/coaching-schedule";
import { effectivePracticeCoaches } from "../src/domain/event-coaching";
import { clubTimestamp } from "../src/domain/event-time";
import { defaultPrograms } from "../src/domain/programs";
import { defaultSeasonId } from "../src/domain/seasons";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { coachingScheduleValue } from "./coaching_schedule_schema";
import { requireMember } from "./identity";

const requireStaff = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	const actor = await requireMember(ctx);
	if (!actor.admin && !actor.coachPrograms.length)
		throw new Error("Coach or admin access required.");
	return actor;
};
export const readWeeklyCoachingSchedule = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
): Promise<WeeklyCoachingSchedule> => {
	const stored = await ctx.db
		.query("coachingSchedules")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.unique();
	return stored
		? {
				programs: stored.programs,
				days: stored.days,
				backupCoachIds: stored.backupCoachIds,
				revision: stored.revision,
			}
		: emptyCoachingSchedule();
};
const activeCoach = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	coachId: string,
): Promise<Doc<"memberships"> | undefined> => {
	const userId = ctx.db.normalizeId("users", coachId);
	const coach = userId
		? await ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.unique()
		: undefined;
	return coach?.clubId === clubId && coach.coachPrograms.length
		? coach
		: undefined;
};
export const effectiveEventCoaches = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	event: ClubEvent,
	partId?: string,
): Promise<{
	assignments: CoachingAssignment[];
	usingWeekly: boolean;
	backupCoachIds: string[];
}> => {
	const [schedule, rows, override] = await Promise.all([
		readWeeklyCoachingSchedule(ctx, clubId),
		ctx.db
			.query("coachingHours")
			.withIndex("by_club_event", (q) =>
				q.eq("clubId", clubId).eq("eventId", event.id),
			)
			.take(32),
		ctx.db
			.query("coachingEventOverrides")
			.withIndex("by_club_event", (q) =>
				q.eq("clubId", clubId).eq("eventId", event.id),
			)
			.unique(),
	]);
	const usingWeekly = !rows.length && !override;
	const historical = usingWeekly
		? await ctx.db
				.query("coachingScheduleHistory")
				.withIndex("by_club_until", (q) =>
					q
						.eq("clubId", clubId)
						.gte(
							"validUntil",
							clubTimestamp(
								event.endDate ?? event.date,
								event.end,
								event.timeZone,
							),
						),
				)
				.first()
		: undefined;
	const effectiveSchedule = historical ?? schedule;
	const defaults =
		usingWeekly && !historical
			? await Promise.all(
					programCoachesFor(effectiveSchedule, event.program).map((id) =>
						activeCoach(ctx, clubId, id),
					),
				)
			: [];
	const roster =
		historical?.coaches ??
		defaults.flatMap((coach) =>
			coach
				? [
						{
							coachId: coach.userId,
							personId: coach.personId,
							name: coach.name,
							programIds: coach.coachPrograms,
						},
					]
				: [],
		);
	const assignments = effectivePracticeCoaches(
		event,
		effectiveSchedule,
		roster,
		usingWeekly ? undefined : rows,
		partId,
	);

	return {
		assignments,
		usingWeekly,
		backupCoachIds: schedule.backupCoachIds,
	};
};
export const materializeEventCoaches = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	event: ClubEvent,
	allowOverLimit = false,
): Promise<void> => {
	const current = await effectiveEventCoaches(ctx, clubId, event);
	const override = await ctx.db
		.query("coachingEventOverrides")
		.withIndex("by_club_event", (q) =>
			q.eq("clubId", clubId).eq("eventId", event.id),
		)
		.unique();
	if (!override)
		await ctx.db.insert("coachingEventOverrides", {
			clubId,
			eventId: event.id,
		});
	if (current.usingWeekly && !allowOverLimit)
		if (current.assignments.length > maxPracticeCoaches)
			throw new Error("Choose up to 3 program coaches before recording hours.");
	if (current.usingWeekly)
		for (const coach of current.assignments) {
			const coachId = ctx.db.normalizeId("users", coach.coachId);
			if (coachId)
				await ctx.db.insert("coachingHours", {
					clubId,
					eventId: event.id,
					coachId,
					personId: coach.personId,
					name: coach.name,
					durationMinutes: coach.durationMinutes,
				});
		}
};
const requirePractice = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	eventId: string,
): Promise<Doc<"events">> => {
	const event = await ctx.db
		.query("events")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", eventId),
		)
		.unique();
	if (!event || event.value.kind === "social" || event.value.kind === "meeting")
		throw new Error("Choose a practice.");
	return event;
};
export const current = query({
	args: {},
	handler: async (ctx): Promise<WeeklyCoachingSchedule> => {
		const actor = await requireStaff(ctx);
		return readWeeklyCoachingSchedule(ctx, actor.clubId);
	},
});
export const save = mutation({
	args: coachingScheduleValue,
	handler: async (ctx, schedule): Promise<void> => {
		const actor = await requireStaff(ctx);
		const error = validateCoachingSchedule(schedule);
		if (error) throw new Error(error);
		const stored = await ctx.db
			.query("coachingSchedules")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.unique();
		if ((stored?.revision ?? 0) !== schedule.revision)
			throw new Error("Coach assignments changed. Reopen them before saving.");
		const club = await ctx.db.get(actor.clubId);
		const programs = club?.programs ?? defaultPrograms();
		const previous = stored ?? emptyCoachingSchedule();
		const changedPrograms = changedCoachingPrograms(previous, schedule);
		const ids = [
			...new Set([
				...changedPrograms.flatMap((programId) =>
					programCoachesFor(schedule, programId),
				),
				...schedule.backupCoachIds,
			]),
		];
		const coaches = await Promise.all(
			ids.map((id) => activeCoach(ctx, actor.clubId, id)),
		);
		const accessError = validateProgramCoaching(
			previous,
			schedule,
			actor,
			programs,
			coaches.flatMap((coach) =>
				coach
					? [
							{
								coachId: coach.userId,
								name: coach.name,
								personId: coach.personId,
								programIds: coach.coachPrograms,
							},
						]
					: [],
			),
		);
		if (accessError) throw new Error(accessError);
		if (stored && changedPrograms.length) {
			const previousIds = [
				...new Set(
					(previous.programs ?? []).flatMap((program) => program.coachIds),
				),
			];
			const previousCoaches = await Promise.all(
				previousIds.map((id) => activeCoach(ctx, actor.clubId, id)),
			);
			await ctx.db.insert("coachingScheduleHistory", {
				clubId: actor.clubId,
				validUntil: Date.now(),
				...previous,
				coaches: previousCoaches.flatMap((coach) =>
					coach
						? [
								{
									coachId: coach.userId,
									personId: coach.personId,
									name: coach.name,
									programIds: coach.coachPrograms,
								},
							]
						: [],
				),
			});
		}
		const next = { ...schedule, revision: schedule.revision + 1 };
		if (stored) await ctx.db.patch(stored._id, next);
		else
			await ctx.db.insert("coachingSchedules", {
				clubId: actor.clubId,
				...next,
			});
	},
});
export const eventState = query({
	args: { eventId: v.string(), partId: v.optional(v.string()) },
	handler: async (
		ctx,
		args,
	): Promise<{
		assignments: CoachingAssignment[];
		usingWeekly: boolean;
		backupCoachIds: string[];
	}> => {
		const actor = await requireStaff(ctx);
		const event = await requirePractice(ctx, actor.clubId, args.eventId);
		if (
			args.partId &&
			!event.value.parts?.some((part) => part.id === args.partId)
		)
			throw new Error("Choose a practice part.");
		return effectiveEventCoaches(ctx, actor.clubId, event.value, args.partId);
	},
});
export const confirmEvent = mutation({
	args: { eventId: v.string() },
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireStaff(ctx);
		const event = await requirePractice(ctx, actor.clubId, args.eventId);
		if (event.value.cancelled) throw new Error("This practice is cancelled.");
		await materializeEventCoaches(ctx, actor.clubId, event.value);
		if (!event.value.seasonId)
			await ctx.db.patch(event._id, {
				value: { ...event.value, seasonId: defaultSeasonId },
			});
	},
});
export const useWeeklyForEvent = mutation({
	args: { eventId: v.string() },
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireStaff(ctx);
		const event = await requirePractice(ctx, actor.clubId, args.eventId);
		if (event.value.cancelled) throw new Error("This practice is cancelled.");
		for (const row of await ctx.db
			.query("coachingHours")
			.withIndex("by_club_event", (q) =>
				q.eq("clubId", actor.clubId).eq("eventId", args.eventId),
			)
			.collect())
			await ctx.db.delete(row._id);
		const override = await ctx.db
			.query("coachingEventOverrides")
			.withIndex("by_club_event", (q) =>
				q.eq("clubId", actor.clubId).eq("eventId", args.eventId),
			)
			.unique();
		if (override) await ctx.db.delete(override._id);
	},
});
