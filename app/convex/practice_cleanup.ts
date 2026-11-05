import { sha256 } from "@oslojs/crypto/sha2";
import { v } from "convex/values";
import {
	cleanPracticeEvent,
	combinePractice,
	combinePracticeResponse,
	practicePairs,
	unreliableHistoricalPractice,
} from "../src/domain/practice-consolidation";
import { practicePartKey } from "../src/domain/practice-parts";
import { internalMutation } from "./_generated/server";
import { migrationMondaySnapshot } from "./migration_monday";

export const apply = internalMutation({
	args: {
		clubId: v.id("clubs"),
		dryRun: v.boolean(),
		phase: v.union(v.literal("schedule"), v.literal("history")),
		expectedFingerprint: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.clubId !== "m17bzc1vg3bsa7he5211prte058e8yyb")
			throw new Error("Unapproved club.");
		const club = await ctx.db.get(args.clubId);
		if (club?.name !== "Calgary Crocs")
			throw new Error("Unexpected production club.");
		const events = await ctx.db
			.query("events")
			.withIndex("by_club", (q) => q.eq("clubId", args.clubId))
			.collect();
		const responses = await ctx.db
			.query("responses")
			.withIndex("by_club", (q) => q.eq("clubId", args.clubId))
			.collect();
		const pairs =
			args.phase === "schedule"
				? practicePairs(events.map((row) => row.value)).slice(0, 12)
				: [];
		const invalidEvents =
			args.phase === "history"
				? events
						.filter((row) => unreliableHistoricalPractice(row.value))
						.slice(0, 40)
				: [];
		const deletedEvents = new Set(invalidEvents.map((row) => row.value.id));
		const deletedDocuments = new Set<string>();
		const retired = new Set(pairs.map((pair) => pair.hockey.id));
		const affected = new Set(
			pairs.flatMap((pair) => [pair.training.id, pair.hockey.id]),
		);
		const updates: {
			table: string;
			before: object;
			apply: () => Promise<void>;
		}[] = [];
		const stage = (
			table: string,
			before: object,
			apply: () => Promise<void>,
		): void => {
			updates.push({ table, before, apply });
		};
		for (const row of invalidEvents) {
			deletedDocuments.add(row._id);
			stage("events", row, () => ctx.db.delete(row._id));
		}
		for (const row of responses.filter((row) =>
			deletedEvents.has(row.value.eventId),
		)) {
			deletedDocuments.add(row._id);
			stage("responses", row, () => ctx.db.delete(row._id));
		}
		const deleteTables = [
			"sessionPlans",
			"sessionCheckins",
			"coachingHours",
		] as const;
		for (const table of deleteTables) {
			const rows = await ctx.db
				.query(table)
				.withIndex("by_club", (q) => q.eq("clubId", args.clubId))
				.collect();
			for (const row of rows.filter((row) => deletedEvents.has(row.eventId))) {
				deletedDocuments.add(row._id);
				stage(table, row, () => ctx.db.delete(row._id));
			}
		}
		const feedback = await ctx.db
			.query("feedback")
			.withIndex("by_club", (q) => q.eq("clubId", args.clubId))
			.collect();
		for (const row of feedback.filter(
			(row) => row.value.eventId && deletedEvents.has(row.value.eventId),
		))
			stage("feedback", row, () =>
				ctx.db.patch(row._id, { value: { ...row.value, eventId: undefined } }),
			);
		const references = await ctx.db
			.query("migrationReferences")
			.withIndex("by_club", (q) => q.eq("clubId", args.clubId))
			.collect();
		const redirect = new Map<string, string>();
		for (const row of events) {
			if (args.phase !== "schedule" || unreliableHistoricalPractice(row.value))
				continue;
			const pair = pairs.find((pair) => pair.training.id === row.value.id);
			if (retired.has(row.value.id)) continue;
			const value = pair
				? combinePractice(pair)
				: cleanPracticeEvent(row.value);
			if (migrationMondaySnapshot(value) !== migrationMondaySnapshot(row.value))
				stage("events", row, () => ctx.db.patch(row._id, { value }));
		}
		for (const pair of pairs) {
			const target = events.find((row) => row.value.id === pair.training.id);
			const source = events.find((row) => row.value.id === pair.hockey.id);
			if (!target || !source) throw new Error("Missing practice pair.");
			const event = combinePractice(pair);
			const rows = responses.filter((row) =>
				[pair.training.id, pair.hockey.id].includes(row.value.eventId),
			);
			for (const personId of new Set(rows.map((row) => row.value.personId))) {
				const training = rows.filter(
					(row) =>
						row.value.eventId === pair.training.id &&
						row.value.personId === personId,
				);
				const hockey = rows.filter(
					(row) =>
						row.value.eventId === pair.hockey.id &&
						row.value.personId === personId,
				);
				if (training.length > 1 || hockey.length > 1)
					throw new Error("Duplicate player responses.");
				const keep = training.at(0) ?? hockey.at(0);
				if (!keep) throw new Error("Missing response.");
				const value = combinePracticeResponse(
					event,
					personId,
					training.at(0)?.value,
					hockey.at(0)?.value,
				);
				stage("responses", keep, () => ctx.db.patch(keep._id, { value }));
				const duplicate = training.length ? hockey.at(0) : undefined;
				if (duplicate) {
					redirect.set(duplicate._id, keep._id);
					stage("responses", duplicate, () => ctx.db.delete(duplicate._id));
				}
			}
			redirect.set(source._id, target._id);
			stage("events", source, () => ctx.db.delete(source._id));
		}
		const teams = await ctx.db
			.query("teams")
			.withIndex("by_club", (q) => q.eq("clubId", args.clubId))
			.collect();
		for (const row of teams.filter((row) => affected.has(row.value.eventId))) {
			const pair = pairs.find((pair) =>
				[pair.training.id, pair.hockey.id].includes(row.value.eventId),
			);
			if (!pair || row.value.partId)
				throw new Error("Existing lineup parts need review.");
			const partId =
				row.value.eventId === pair.training.id ? "training" : "hockey";
			const value = {
				...row.value,
				id: practicePartKey(pair.training.id, partId),
				eventId: pair.training.id,
				partId,
			};
			stage("teams", row, () => ctx.db.patch(row._id, { value }));
		}
		for (const ref of references) {
			if (deletedDocuments.has(ref.targetId)) {
				stage("migrationReferences", ref, () => ctx.db.delete(ref._id));
				continue;
			}
			const targetId = redirect.get(ref.targetId);
			if (targetId)
				stage("migrationReferences", ref, () =>
					ctx.db.patch(ref._id, { targetId }),
				);
		}
		const guardedTables = [
			"plans",
			"sessionPlans",
			"sessionCheckins",
			"sessionPerformance",
			"feedback",
			"conversations",
			"coachingHours",
			"fitnessSessions",
			"eventAttendanceFlags",
			"coachingEventOverrides",
			"equipmentGuests",
			"publicCalendarEntries",
			"inboxItems",
		] as const;
		for (const table of guardedTables) {
			const rows = await ctx.db
				.query(table)
				.withIndex("by_club", (q) => q.eq("clubId", args.clubId))
				.collect();
			for (const row of rows) {
				const serialized = JSON.stringify(row);
				if (
					!deleteTables.some((entry) => entry === table) &&
					table !== "feedback" &&
					[...deletedEvents].some((id) =>
						serialized.includes(JSON.stringify(id)),
					)
				)
					throw new Error(
						`Deleted historical event has related ${table} records requiring review.`,
					);
				if ([...retired].some((id) => serialized.includes(JSON.stringify(id))))
					throw new Error(
						`Related ${table} record requires explicit migration.`,
					);
			}
		}
		const calendarFeeds = await ctx.db
			.query("calendarFeeds")
			.withIndex("by_club", (q) => q.eq("clubId", args.clubId))
			.collect();
		if (pairs.length && calendarFeeds.length)
			throw new Error("Calendar feeds need explicit reconciliation.");
		const snapshot = migrationMondaySnapshot(
			updates.map(({ table, before }) => ({ table, before })),
		);
		const fingerprint = Array.from(
			sha256(new TextEncoder().encode(snapshot)),
			(byte) => byte.toString(16).padStart(2, "0"),
		).join("");
		const counts = updates.reduce<Record<string, number>>((counts, row) => {
			counts[row.table] = (counts[row.table] ?? 0) + 1;
			return counts;
		}, {});
		if (!args.dryRun && updates.length) {
			if (updates.length > 2500)
				throw new Error("Migration batch is too large.");
			if (args.expectedFingerprint !== fingerprint)
				throw new Error("Production changed since dry run. Review again.");
			for (const index of Array.from(
				{ length: Math.ceil(updates.length / 100) },
				(_, index) => index,
			)) {
				await ctx.db.insert("migrationArchive", {
					clubId: args.clubId,
					key: `practice-cleanup:${fingerprint}:${index}`,
					source: "production",
					entity: "PracticeConsolidation",
					payload: migrationMondaySnapshot(
						updates
							.slice(index * 100, (index + 1) * 100)
							.map(({ table, before }) => ({ table, before })),
					),
					fingerprint,
					disposition: "consolidated-parts-and-titles",
					createdAt: Date.now(),
				});
			}
			for (const update of updates) await update.apply();
		}
		return {
			dryRun: args.dryRun,
			pairs: pairs.length,
			invalidEventsRemoved: invalidEvents.length,
			counts,
			fingerprint,
		};
	},
});

export const openMondaySeason = internalMutation({
	args: { dryRun: v.boolean(), clubId: v.id("clubs") },
	handler: async (
		ctx,
		args,
	): Promise<{
		dryRun: boolean;
		practicesOpened: number;
		programChanged: boolean;
	}> => {
		if (args.clubId !== "m17bzc1vg3bsa7he5211prte058e8yyb")
			throw new Error("Unapproved club.");
		const club = await ctx.db.get(args.clubId);
		if (!club || club.name !== "Calgary Crocs")
			throw new Error("Approved club unavailable.");
		const program = club.programs?.find(
			(program) => program.id === "monday-training",
		);
		if (!program || (program.seasonId && program.seasonId !== "2026-2027"))
			throw new Error("Monday season requires review.");
		const now = Date.now();
		const season = club.seasons?.find(
			(season) => season.id === (program.seasonId ?? "2026-2027"),
		);
		if (!season) throw new Error("Season unavailable.");
		const events = await ctx.db
			.query("events")
			.withIndex("by_program_date", (q) =>
				q
					.eq("clubId", club._id)
					.eq("value.program", program.id)
					.gte("value.date", season.start)
					.lte("value.date", season.end),
			)
			.collect();
		const changes = events.filter(
			(row) =>
				!row.value.cancelled &&
				(row.value.closesAt ?? 0) > now &&
				(row.value.signup !== "open" ||
					row.value.programRsvp?.openRule !== "season"),
		);
		const programChanged = program.rsvp.openRule !== "season";
		if (!args.dryRun && (programChanged || changes.length)) {
			await ctx.db.insert("migrationArchive", {
				clubId: club._id,
				key: `monday-season-opening:${now}`,
				source: "production",
				entity: "MondaySeasonOpening",
				payload: JSON.stringify({ program, events: changes }),
				fingerprint: String(now),
				disposition: "season-open",
				createdAt: now,
			});
			const rsvp = { ...program.rsvp, openRule: "season" as const };
			if (programChanged)
				await ctx.db.patch(club._id, {
					programs: club.programs?.map((entry) =>
						entry.id === program.id
							? { ...entry, rsvp, revision: entry.revision + 1 }
							: entry,
					),
				});
			for (const row of changes)
				await ctx.db.patch(row._id, {
					value: {
						...row.value,
						opensAt: Math.min(row.value.opensAt ?? now, now),
						signup: "open",
						programRsvp: rsvp,
						programRsvpManaged: true,
					},
				});
		}
		return {
			dryRun: args.dryRun,
			practicesOpened: changes.length,
			programChanged,
		};
	},
});

export const closeMondayNextTerm = internalMutation({
	args: { clubId: v.id("clubs"), dryRun: v.boolean() },
	handler: async (
		ctx,
		args,
	): Promise<{ dryRun: boolean; practicesClosed: number }> => {
		if (args.clubId !== "m17bzc1vg3bsa7he5211prte058e8yyb")
			throw new Error("Unapproved club.");
		const club = await ctx.db.get(args.clubId);
		const program = club?.programs?.find(
			(entry) => entry.id === "monday-training",
		);
		if (!club || club.name !== "Calgary Crocs" || !program)
			throw new Error("Monday program unavailable.");
		const events = await ctx.db
			.query("events")
			.withIndex("by_program_date", (q) =>
				q
					.eq("clubId", args.clubId)
					.eq("value.program", program.id)
					.gte("value.date", "2027-01-01")
					.lte("value.date", "2027-08-31"),
			)
			.collect();
		const changes = events.filter(
			(row) =>
				!row.value.cancelled &&
				(row.value.signup !== "closed" ||
					row.value.programRsvpManaged !== false),
		);
		if (!args.dryRun && changes.length) {
			const now = Date.now();
			await ctx.db.insert("migrationArchive", {
				clubId: args.clubId,
				key: `monday-next-term-closed:${now}`,
				source: "production",
				entity: "MondayNextTermClosed",
				payload: JSON.stringify({ program, events: changes }),
				fingerprint: String(now),
				disposition: "closed-until-reopened",
				createdAt: now,
			});
			await ctx.db.patch(club._id, {
				programs: club.programs?.map((entry) =>
					entry.id === program.id
						? {
								...entry,
								rsvp: { ...entry.rsvp, openRule: "weekly" as const },
								revision: entry.revision + 1,
							}
						: entry,
				),
			});
			for (const row of changes)
				await ctx.db.patch(row._id, {
					value: {
						...row.value,
						signup: "closed",
						opensAt: undefined,
						closesAt: now,
						programRsvp: undefined,
						programRsvpManaged: false,
					},
				});
		}
		return { dryRun: args.dryRun, practicesClosed: changes.length };
	},
});
