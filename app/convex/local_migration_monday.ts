import { sha256 } from "@oslojs/crypto/sha2";
import { v } from "convex/values";
import { practicePartKey } from "../src/domain/practice-parts";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, type QueryCtx } from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";
import {
	migrationMondayPairs,
	migrationMondayResponse,
	migrationMondaySnapshot,
} from "./migration_monday";
import { eventsValue, responsesValue } from "./validators";

type ReconciliationOutcome = {
	status: string;
	sourceEventId: string;
	targetEventId: string;
	responsesMoved: number;
	responsesMerged: number;
	relatedMoved: number;
	referencesRetargeted: number;
};

const ownerClub = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	requireLocalEmail("edwinzhang64@gmail.com");
	if (
		process.env.OUTBOUND_DELIVERY_DISABLED !== "true" ||
		process.env.PUSH_DELIVERY_ENABLED !== "false" ||
		process.env.WEB_PUSH_DELIVERY_ENABLED !== "false"
	)
		throw new Error(
			"Monday reconciliation requires every local outbound guard.",
		);
	const owner = await ctx.db
		.query("users")
		.withIndex("email", (q) => q.eq("email", "edwinzhang64@gmail.com"))
		.unique();
	if (!owner?.emailVerificationTime)
		throw new Error("Verified local owner required.");
	const memberships = await ctx.db
		.query("memberships")
		.withIndex("by_user", (q) => q.eq("userId", owner._id))
		.collect();
	const member = memberships.at(0);
	const club = member ? await ctx.db.get(member.clubId) : undefined;
	if (
		memberships.length !== 1 ||
		!member?.admin ||
		member.personId !== "edwin" ||
		club?.ownerId !== owner._id ||
		club.name !== "Calgary Crocs"
	)
		throw new Error(
			"Monday reconciliation is restricted to the approved private local club.",
		);
	return member;
};

export const reconcile = internalMutation({
	args: {
		dryRun: v.boolean(),
		source: v.object({
			sourceId: v.string(),
			fingerprint: v.string(),
			value: eventsValue,
		}),
		target: v.object({
			sourceId: v.string(),
			fingerprint: v.string(),
			value: eventsValue,
		}),
		responses: v.array(
			v.object({
				sourceId: v.string(),
				fingerprint: v.string(),
				value: responsesValue,
			}),
		),
	},
	handler: async (ctx, args): Promise<ReconciliationOutcome> => {
		const owner = await ownerClub(ctx);
		const clubId = owner.clubId;
		const from = args.source.value.id;
		const to = args.target.value.id;
		if (args.responses.length > 200)
			throw new Error(
				"Reconcile one Monday with at most 200 response baselines.",
			);
		if (
			!migrationMondayPairs([args.source.value, args.target.value]).some(
				(pair) => pair.sourceId === from && pair.targetId === to,
			)
		)
			throw new Error("Monday source pair is ineligible.");
		const key = `monday-reconciliation:${from}`;
		const previous = await ctx.db
			.query("migrationArchive")
			.withIndex("by_club_key", (q) => q.eq("clubId", clubId).eq("key", key))
			.unique();
		const references = await ctx.db
			.query("migrationReferences")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		const reference = (
			kind: string,
			sourceId: string,
		): Doc<"migrationReferences"> | undefined =>
			references.find((row) => row.key === `${kind}:${sourceId}`);
		const sourceReference = reference("events", args.source.sourceId);
		const targetReference = reference("events", args.target.sourceId);
		if (
			!sourceReference ||
			!targetReference ||
			sourceReference.fingerprint !== args.source.fingerprint ||
			targetReference.fingerprint !== args.target.fingerprint
		)
			throw new Error(
				"Original event import references do not match the reviewed baselines.",
			);
		if (previous) {
			if (
				sourceReference.targetId !== targetReference.targetId ||
				previous.disposition !== `reconciled-into:${to}`
			)
				throw new Error("Previous Monday reconciliation needs review.");
			return {
				status: "already-reconciled",
				sourceEventId: from,
				targetEventId: to,
				responsesMoved: 0,
				responsesMerged: 0,
				relatedMoved: 0,
				referencesRetargeted: 0,
			};
		}
		const events = await ctx.db
			.query("events")
			.withIndex("by_date", (q) =>
				q.eq("clubId", clubId).eq("value.date", args.source.value.date),
			)
			.collect();
		if (
			!migrationMondayPairs(events.map((row) => row.value)).some(
				(pair) => pair.sourceId === from && pair.targetId === to,
			)
		)
			throw new Error(
				"Current Monday events are ambiguous or were rescheduled.",
			);
		const source = events.find((row) => row.value.id === from);
		const target = events.find((row) => row.value.id === to);
		if (
			!source ||
			!target ||
			sourceReference.targetId !== source._id ||
			targetReference.targetId !== target._id
		)
			throw new Error("Monday event import ownership is unavailable.");
		if (
			migrationMondaySnapshot(source.value) !==
			migrationMondaySnapshot(args.source.value)
		)
			throw new Error(
				"The redundant Base44 event was edited; retain it for manual review.",
			);
		const updates: {
			table: string;
			row: object;
			apply: () => Promise<void>;
		}[] = [];
		const stage = (
			table: string,
			row: object,
			apply: () => Promise<void>,
		): void => {
			updates.push({ table, row, apply });
		};
		const baseline = (
			row: Doc<"responses">,
		): Doc<"responses">["value"] | undefined => {
			const entry = args.responses.find(
				(entry) => entry.value.id === row.value.id,
			);
			if (!entry) return undefined;
			const imported = reference("responses", entry.sourceId);
			if (
				!imported ||
				imported.targetId !== row._id ||
				imported.fingerprint !== entry.fingerprint
			)
				throw new Error(
					"Response baseline is not owned by its original import reference.",
				);
			return entry.value;
		};
		const sourceResponses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) =>
				q.eq("clubId", clubId).eq("value.eventId", from),
			)
			.collect();
		const targetResponses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) =>
				q.eq("clubId", clubId).eq("value.eventId", to),
			)
			.collect();
		for (const row of [...sourceResponses, ...targetResponses]) {
			const imported = references.find(
				(ref) => ref.kind === "responses" && ref.targetId === row._id,
			);
			if (imported && !baseline(row))
				throw new Error(
					"Every imported Monday response requires its original baseline.",
				);
			if (
				[
					...(row.value.partIds ?? []),
					...(row.value.partAttendance?.map((part) => part.partId) ?? []),
				].some((id) => !target.value.parts?.some((part) => part.id === id))
			)
				throw new Error(
					"Monday response part links require individual review.",
				);
		}
		for (const rows of [sourceResponses, targetResponses])
			if (new Set(rows.map((row) => row.value.personId)).size !== rows.length)
				throw new Error("Duplicate player responses need individual review.");
		const merged = sourceResponses.flatMap((row) => {
			const duplicate = targetResponses.find(
				(entry) => entry.value.personId === row.value.personId,
			);
			const value = migrationMondayResponse(
				row.value,
				duplicate?.value,
				baseline(row),
				duplicate ? baseline(duplicate) : undefined,
				to,
			);
			stage("responses", row, () => ctx.db.patch(row._id, { value }));
			if (!duplicate) return [];
			stage("responses", duplicate, () => ctx.db.delete(duplicate._id));
			for (const ref of references.filter(
				(ref) => ref.kind === "responses" && ref.targetId === duplicate._id,
			))
				stage("migrationReferences", ref, () =>
					ctx.db.patch(ref._id, { targetId: row._id }),
				);
			return [duplicate];
		});
		const teams = await ctx.db
			.query("teams")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of teams.filter((row) => row.value.eventId === from)) {
			if (
				row.value.partId &&
				!target.value.parts?.some((part) => part.id === row.value.partId)
			)
				throw new Error("Lineup part needs individual Monday reconciliation.");
			if (
				teams.some(
					(other) =>
						other.value.eventId === to &&
						other.value.partId === row.value.partId,
				)
			)
				throw new Error(
					"Both Monday events have a lineup; review before combining.",
				);
			stage("teams", row, () =>
				ctx.db.patch(row._id, {
					value: {
						...row.value,
						id: practicePartKey(to, row.value.partId),
						eventId: to,
					},
				}),
			);
		}
		const plans = await ctx.db
			.query("sessionPlans")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of plans.filter((row) => row.eventId === from)) {
			if (
				row.partId &&
				!target.value.parts?.some((part) => part.id === row.partId)
			)
				throw new Error(
					"Practice plan part needs individual Monday reconciliation.",
				);
			const nextKey = practicePartKey(to, row.partId);
			if (plans.some((other) => other.key === nextKey))
				throw new Error(
					"Both Monday events have a practice plan; review before combining.",
				);
			stage("sessionPlans", row, () =>
				ctx.db.patch(row._id, { eventId: to, key: nextKey }),
			);
		}
		const legacyPlans = await ctx.db
			.query("plans")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of legacyPlans.filter((row) => row.value.id === from)) {
			if (legacyPlans.some((other) => other.value.id === to))
				throw new Error("Both Monday events have legacy practice notes.");
			stage("plans", row, () =>
				ctx.db.patch(row._id, { value: { ...row.value, id: to } }),
			);
		}
		const checkins = await ctx.db
			.query("sessionCheckins")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of checkins.filter((row) => row.eventId === from)) {
			if (
				checkins.some(
					(other) => other.eventId === to && other.personId === row.personId,
				)
			)
				throw new Error(
					"Both Monday events have a player check-in; review before combining.",
				);
			stage("sessionCheckins", row, () =>
				ctx.db.patch(row._id, { eventId: to }),
			);
		}
		const performance = await ctx.db
			.query("sessionPerformance")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of performance.filter((row) => row.eventId === from)) {
			if (
				performance.some(
					(other) =>
						other.eventId === to &&
						other.personId === row.personId &&
						other.kind === row.kind &&
						other.authorKey === row.authorKey,
				)
			)
				throw new Error(
					"Both Monday events have matching performance feedback; review before combining.",
				);
			stage("sessionPerformance", row, () =>
				ctx.db.patch(row._id, { eventId: to }),
			);
		}
		const feedback = await ctx.db
			.query("feedback")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of feedback.filter((row) => row.value.eventId === from))
			stage("feedback", row, () =>
				ctx.db.patch(row._id, { value: { ...row.value, eventId: to } }),
			);
		const conversations = await ctx.db
			.query("conversations")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of conversations.filter(
			(row) => row.value.eventId === from,
		)) {
			if (conversations.some((other) => other.value.eventId === to))
				throw new Error(
					"Both Monday events have discussions; retain them for review.",
				);
			stage("conversations", row, () =>
				ctx.db.patch(row._id, { value: { ...row.value, eventId: to } }),
			);
		}
		const hours = await ctx.db
			.query("coachingHours")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of hours.filter((row) => row.eventId === from)) {
			if (
				hours.some(
					(other) => other.eventId === to && other.coachId === row.coachId,
				)
			)
				throw new Error(
					"Both Monday events have coaching hours for the same coach.",
				);
			stage("coachingHours", row, () => ctx.db.patch(row._id, { eventId: to }));
		}
		const fitness = await ctx.db
			.query("fitnessSessions")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of fitness.filter((row) => row.eventId === from))
			stage("fitnessSessions", row, () =>
				ctx.db.patch(row._id, { eventId: to }),
			);
		const flags = await ctx.db
			.query("eventAttendanceFlags")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of flags.filter((row) => row.eventId === from)) {
			if (
				flags.some(
					(other) => other.eventId === to && other.personId === row.personId,
				)
			)
				throw new Error(
					"Both Monday events have an attendance adjustment for the same player.",
				);
			stage("eventAttendanceFlags", row, () =>
				ctx.db.patch(row._id, { eventId: to }),
			);
		}
		const overrides = await ctx.db
			.query("coachingEventOverrides")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of overrides.filter((row) => row.eventId === from)) {
			if (overrides.some((other) => other.eventId === to))
				throw new Error(
					"Both Monday events have coaching assignment overrides.",
				);
			stage("coachingEventOverrides", row, () =>
				ctx.db.patch(row._id, { eventId: to }),
			);
		}
		const guests = await ctx.db
			.query("equipmentGuests")
			.withIndex("by_club_event", (q) =>
				q.eq("clubId", clubId).eq("eventId", from),
			)
			.collect();
		const publicEntries = await ctx.db
			.query("publicCalendarEntries")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		const feeds = await ctx.db
			.query("calendarFeeds")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		const calendarEntries = (
			await Promise.all(
				feeds.map((feed) =>
					ctx.db
						.query("calendarEntries")
						.withIndex("by_feed", (q) => q.eq("feedId", feed._id))
						.collect(),
				),
			)
		).flat();
		if (
			guests.length ||
			publicEntries.some((row) => row.value.eventId === from) ||
			calendarEntries.some((row) => row.value.eventId === from)
		)
			throw new Error(
				"Retired Monday has equipment or published calendar references requiring separate review.",
			);
		const inbox = await ctx.db
			.query("inboxItems")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const row of inbox.filter(
			(row) =>
				row.eventIds?.includes(from) ||
				row.entityId === from ||
				row.relatedId === from ||
				merged.some((response) => response._id === row.entityId),
		))
			stage("inboxItems", row, () =>
				ctx.db.patch(row._id, {
					eventIds: row.eventIds
						? [...new Set(row.eventIds?.map((id) => (id === from ? to : id)))]
						: undefined,
					relatedId: row.relatedId === from ? to : row.relatedId,
					entityId:
						row.entityId === from
							? to
							: (sourceResponses.find((response) =>
									merged.some(
										(duplicate) =>
											duplicate._id === row.entityId &&
											duplicate.value.personId === response.value.personId,
									),
								)?._id ?? row.entityId),
				}),
			);
		for (const ref of references.filter(
			(row) => row.kind === "events" && row.targetId === source._id,
		))
			stage("migrationReferences", ref, () =>
				ctx.db.patch(ref._id, { targetId: target._id }),
			);
		const outcome = {
			status: args.dryRun ? "ready" : "reconciled",
			sourceEventId: from,
			targetEventId: to,
			responsesMoved: sourceResponses.length,
			responsesMerged: merged.length,
			relatedMoved: updates.filter(
				(row) =>
					row.table !== "responses" && row.table !== "migrationReferences",
			).length,
			referencesRetargeted: updates.filter(
				(row) => row.table === "migrationReferences",
			).length,
		};
		if (args.dryRun) return outcome;
		const payload = JSON.stringify({
			source,
			target,
			targetReference,
			baselines: args,
			updates: updates.map(({ table, row }) => ({ table, row })),
			outcome,
		});
		const fingerprint = Array.from(
			sha256(new TextEncoder().encode(payload)),
			(byte) => byte.toString(16).padStart(2, "0"),
		).join("");
		await ctx.db.insert("migrationArchive", {
			clubId,
			key,
			source: "base44+sporteasy",
			entity: "MondayReconciliation",
			payload,
			fingerprint,
			disposition: `reconciled-into:${to}`,
			createdAt: Date.now(),
		});
		for (const update of updates) await update.apply();
		await ctx.db.delete(source._id);
		return outcome;
	},
});
