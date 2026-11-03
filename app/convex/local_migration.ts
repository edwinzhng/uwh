import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";
import { linkImportedResourceFiles } from "./local_migration_media";
import { localMigrationRecord } from "./local_migration_schema";
import { clubProgramValue } from "./program_schema";

const target = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	requireLocalEmail("edwinzhang64@gmail.com");
	if (
		process.env.OUTBOUND_DELIVERY_DISABLED !== "true" ||
		process.env.PUSH_DELIVERY_ENABLED !== "false" ||
		process.env.WEB_PUSH_DELIVERY_ENABLED !== "false"
	)
		throw new Error("Local migration requires every outbound delivery guard.");
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
	const membership = memberships.at(0);
	const club = membership ? await ctx.db.get(membership.clubId) : undefined;
	if (
		memberships.length !== 1 ||
		!membership?.admin ||
		membership.personId !== "edwin" ||
		club?.ownerId !== owner._id ||
		club.name !== "Calgary Crocs"
	)
		throw new Error(
			"Migration destination is not the approved private owner club.",
		);
	return membership;
};

export const configure = internalMutation({
	args: {
		programs: v.array(clubProgramValue),
		seasons: v.array(
			v.object({
				id: v.string(),
				name: v.string(),
				start: v.string(),
				end: v.string(),
			}),
		),
		venues: v.array(v.string()),
		dryRun: v.boolean(),
	},
	handler: async (ctx, args): Promise<void> => {
		const owner = await target(ctx);
		const fingerprint = JSON.stringify({
			programs: args.programs,
			seasons: args.seasons,
			venues: args.venues,
		});
		const previous = await ctx.db
			.query("migrationReferences")
			.withIndex("by_club_key", (q) =>
				q.eq("clubId", owner.clubId).eq("key", "configuration"),
			)
			.unique();
		if (previous) {
			if (previous.fingerprint !== fingerprint)
				throw new Error(
					"Source configuration changed; review before replacing local club settings.",
				);
			return;
		}
		if (!args.dryRun) {
			await ctx.db.patch(owner.clubId, {
				programs: args.programs,
				seasons: args.seasons,
				venues: args.venues,
				reminders: false,
			});
			await ctx.db.insert("migrationReferences", {
				clubId: owner.clubId,
				key: "configuration",
				sourceId: "configuration",
				kind: "configuration",
				targetId: owner.clubId,
				fingerprint,
				createdAt: Date.now(),
			});
		}
	},
});

export const apply = internalMutation({
	args: {
		dryRun: v.boolean(),
		entries: v.array(
			v.object({
				sourceId: v.string(),
				fingerprint: v.string(),
				record: localMigrationRecord,
			}),
		),
	},
	handler: async (
		ctx,
		args,
	): Promise<
		{ sourceId: string; kind: string; targetId?: string; status: string }[]
	> => {
		const owner = await target(ctx);
		if (args.entries.length > 100)
			throw new Error("Use batches of at most 100 records.");
		const outcomes: {
			sourceId: string;
			kind: string;
			targetId?: string;
			status: string;
		}[] = [];
		for (const entry of args.entries) {
			const record = entry.record;
			const key = `${record.kind}:${entry.sourceId}`;
			const previous = await ctx.db
				.query("migrationReferences")
				.withIndex("by_club_key", (q) =>
					q.eq("clubId", owner.clubId).eq("key", key),
				)
				.unique();
			if (previous) {
				if (previous.fingerprint !== entry.fingerprint)
					throw new Error(
						`Source changed; review ${key} before replacing imported history.`,
					);
				const targetId = ctx.db.normalizeId(
					record.kind === "actors" ? "users" : record.kind,
					previous.targetId,
				);
				const row = targetId ? await ctx.db.get(targetId) : undefined;
				if (!row || ("clubId" in row && row.clubId !== owner.clubId))
					throw new Error(`Imported target missing: ${key}`);
				outcomes.push({
					sourceId: entry.sourceId,
					kind: record.kind,
					targetId: previous.targetId,
					status: "unchanged",
				});
				continue;
			}
			if (args.dryRun) {
				outcomes.push({
					sourceId: entry.sourceId,
					kind: record.kind,
					status: "create",
				});
				continue;
			}
			const targetId = await (async (): Promise<string> => {
				if (record.kind === "actors") {
					if (record.value.personId === "edwin") return owner.userId;
					return ctx.db.insert("users", { name: record.value.name });
				}
				if (
					record.kind === "conversations" &&
					(record.value.id === "club" ||
						record.value.id.startsWith("room:program:"))
				) {
					const existing = await ctx.db
						.query("conversations")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", owner.clubId).eq("value.id", record.value.id),
						)
						.unique();
					if (existing) {
						if (existing.value.kind === "direct" || existing.value.eventId)
							throw new Error("Existing managed conversation needs review.");
						return existing._id;
					}
				}
				if (record.kind === "members" && record.value.id === "edwin") {
					const person = await ctx.db
						.query("members")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", owner.clubId).eq("value.id", "edwin"),
						)
						.unique();
					if (
						!person ||
						person.value.goal ||
						person.value.steps ||
						person.value.rating !== 3
					)
						throw new Error(
							"Review the existing owner profile before merging source history.",
						);
					await ctx.db.replace(person._id, {
						clubId: owner.clubId,
						value: record.value,
					});
					return person._id;
				}
				if (
					record.kind === "members" ||
					record.kind === "events" ||
					record.kind === "responses" ||
					record.kind === "teams" ||
					record.kind === "feedback" ||
					record.kind === "conversations" ||
					record.kind === "messages" ||
					record.kind === "notices"
				) {
					const duplicate = await ctx.db
						.query(record.kind)
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", owner.clubId).eq("value.id", record.value.id),
						)
						.unique();
					if (duplicate)
						throw new Error(
							`Existing destination key needs review: ${record.kind}:${record.value.id}`,
						);
				}
				if (record.kind === "members")
					return ctx.db.insert("members", {
						clubId: owner.clubId,
						value: record.value,
					});
				if (record.kind === "events")
					return ctx.db.insert("events", {
						clubId: owner.clubId,
						value: record.value,
					});
				if (record.kind === "responses")
					return ctx.db.insert("responses", {
						clubId: owner.clubId,
						value: record.value,
					});
				if (record.kind === "teams")
					return ctx.db.insert("teams", {
						clubId: owner.clubId,
						value: record.value,
					});
				if (record.kind === "feedback")
					return ctx.db.insert("feedback", {
						clubId: owner.clubId,
						value: record.value,
					});
				if (record.kind === "conversations")
					return ctx.db.insert("conversations", {
						clubId: owner.clubId,
						value: record.value,
					});
				if (record.kind === "messages")
					return ctx.db.insert("messages", {
						clubId: owner.clubId,
						value: record.value,
					});
				if (record.kind === "notices")
					return ctx.db.insert("notices", {
						clubId: owner.clubId,
						value: record.value,
					});
				return ctx.db.insert(record.kind, {
					...record.value,
					clubId: owner.clubId,
				});
			})();
			if (record.kind === "resources") {
				const id = ctx.db.normalizeId("resources", targetId);
				const resource = id ? await ctx.db.get(id) : undefined;
				if (!resource) throw new Error("Imported resource is missing.");
				await linkImportedResourceFiles(ctx, resource, false);
			}
			await ctx.db.insert("migrationReferences", {
				clubId: owner.clubId,
				key,
				sourceId: entry.sourceId,
				kind: record.kind,
				fingerprint: entry.fingerprint,
				targetId,
				createdAt: Date.now(),
			});
			outcomes.push({
				sourceId: entry.sourceId,
				kind: record.kind,
				targetId,
				status: "created",
			});
		}
		return outcomes;
	},
});

export const repairMediaLinks = internalMutation({
	args: { dryRun: v.boolean() },
	handler: async (
		ctx,
		{ dryRun },
	): Promise<{ resources: number; links: number }> => {
		const owner = await target(ctx);
		const references = await ctx.db
			.query("migrationReferences")
			.withIndex("by_club_key", (q) =>
				q
					.eq("clubId", owner.clubId)
					.gte("key", "resources:")
					.lt("key", "resources;"),
			)
			.take(101);
		if (references.length > 100)
			throw new Error("Review a bounded media repair batch.");
		const counts: number[] = [];
		for (const reference of references) {
			const id = ctx.db.normalizeId("resources", reference.targetId);
			const resource = id ? await ctx.db.get(id) : undefined;
			if (!resource || resource.clubId !== owner.clubId)
				throw new Error("Imported resource destination needs review.");
			counts.push(await linkImportedResourceFiles(ctx, resource, dryRun));
		}
		return {
			resources: references.length,
			links: counts.reduce((sum, count) => sum + count, 0),
		};
	},
});

export const archive = internalMutation({
	args: {
		dryRun: v.boolean(),
		entries: v.array(
			v.object({
				key: v.string(),
				source: v.string(),
				entity: v.string(),
				payload: v.string(),
				fingerprint: v.string(),
				disposition: v.string(),
			}),
		),
	},
	handler: async (ctx, args): Promise<number> => {
		const owner = await target(ctx);
		if (args.entries.length > 50)
			throw new Error("Use at most 50 archive rows.");
		for (const entry of args.entries) {
			const previous = await ctx.db
				.query("migrationArchive")
				.withIndex("by_club_key", (q) =>
					q.eq("clubId", owner.clubId).eq("key", entry.key),
				)
				.unique();
			if (previous && previous.fingerprint !== entry.fingerprint)
				throw new Error("Archived source changed.");
			if (!previous && !args.dryRun)
				await ctx.db.insert("migrationArchive", {
					...entry,
					clubId: owner.clubId,
					createdAt: Date.now(),
				});
		}
		return args.entries.length;
	},
});

export const mediaUpload = internalMutation({
	args: {},
	handler: async (ctx): Promise<string> => {
		await target(ctx);
		return ctx.storage.generateUploadUrl();
	},
});

export const enableOwnerCoaching = internalMutation({
	args: {},
	handler: async (ctx): Promise<{ programs: number }> => {
		const owner = await target(ctx);
		const club = await ctx.db.get(owner.clubId);
		const programs = club?.programs?.map((entry) => entry.id) ?? [];
		if (
			programs.length !== 6 ||
			programs.some((id) => !id.startsWith("base44:"))
		)
			throw new Error(
				"Review the imported programs before assigning coaching.",
			);
		if (
			owner.coachPrograms.length &&
			JSON.stringify(owner.coachPrograms.slice().sort()) !==
				JSON.stringify(programs.slice().sort())
		)
			throw new Error(
				"Review the existing coach assignment before changing it.",
			);
		await ctx.db.patch(owner._id, { coachPrograms: programs });
		return { programs: programs.length };
	},
});

export const attachProfilePhoto = internalMutation({
	args: { personId: v.string(), photoId: v.id("memberProfilePhotos") },
	handler: async (ctx, args): Promise<void> => {
		const owner = await target(ctx);
		const photo = await ctx.db.get(args.photoId);
		const profile = await ctx.db
			.query("memberProfiles")
			.withIndex("by_club_person", (q) =>
				q.eq("clubId", owner.clubId).eq("personId", args.personId),
			)
			.unique();
		const imported = await ctx.db
			.query("migrationReferences")
			.withIndex("by_club", (q) => q.eq("clubId", owner.clubId))
			.filter((q) =>
				q.and(
					q.eq(q.field("kind"), "memberProfilePhotos"),
					q.eq(q.field("targetId"), args.photoId),
				),
			)
			.unique();
		if (
			!photo ||
			!imported ||
			photo.clubId !== owner.clubId ||
			photo.personId !== args.personId ||
			!profile
		)
			throw new Error("Imported profile photo is unavailable.");
		if (profile.photoId && profile.photoId !== photo._id)
			throw new Error(
				"A local profile photo already exists; preserve it for review.",
			);
		if (!profile.photoId)
			await ctx.db.patch(profile._id, { photoId: photo._id });
	},
});

export const rebuildFitness = internalMutation({
	args: { testId: v.id("fitnessTests") },
	handler: async (ctx, args): Promise<{ results: number; stats: number }> => {
		const owner = await target(ctx);
		const test = await ctx.db.get(args.testId);
		if (!test || test.clubId !== owner.clubId)
			throw new Error("Imported fitness test unavailable.");
		const sessions = await ctx.db
			.query("fitnessSessions")
			.withIndex("by_club", (q) => q.eq("clubId", owner.clubId))
			.collect();
		const results = (
			await ctx.db
				.query("fitnessResults")
				.withIndex("by_club", (q) => q.eq("clubId", owner.clubId))
				.collect()
		).filter((row) => row.testId === test._id);
		const groups = new Map<string, typeof results>();
		for (const row of results) {
			const key = `${row.seasonId}:${row.personId}`;
			groups.set(key, [...(groups.get(key) ?? []), row]);
		}
		for (const rows of groups.values()) {
			const first = rows.at(0);
			if (!first) continue;
			const previous = await ctx.db
				.query("fitnessStats")
				.withIndex("by_test_season_person", (q) =>
					q
						.eq("testId", test._id)
						.eq("seasonId", first.seasonId)
						.eq("personId", first.personId),
				)
				.unique();
			const values = {
				clubId: owner.clubId,
				testId: test._id,
				seasonId: first.seasonId,
				personId: first.personId,
				count: rows.length,
				total: rows.reduce((sum, row) => sum + row.value, 0),
				best:
					(test.lowerIsBetter ?? test.unit === "time")
						? Math.min(...rows.map((row) => row.value))
						: Math.max(...rows.map((row) => row.value)),
			};
			if (previous) await ctx.db.replace(previous._id, values);
			else await ctx.db.insert("fitnessStats", values);
		}
		for (const session of sessions.filter((row) => row.testId === test._id))
			await ctx.db.patch(session._id, {
				resultCount: results.filter((row) => row.sessionId === session._id)
					.length,
			});
		return { results: results.length, stats: groups.size };
	},
});

export const status = internalQuery({
	args: {},
	handler: async (ctx): Promise<object> => {
		const owner = await target(ctx);
		const refs = await ctx.db
			.query("migrationReferences")
			.withIndex("by_club", (q) => q.eq("clubId", owner.clubId))
			.collect();
		const archive = await ctx.db
			.query("migrationArchive")
			.withIndex("by_club", (q) => q.eq("clubId", owner.clubId))
			.collect();
		const actualCounts = Object.fromEntries(
			await Promise.all(
				(
					[
						"members",
						"events",
						"responses",
						"feedback",
						"conversations",
						"messages",
						"teams",
						"fitnessResults",
						"fitnessStats",
						"coachingHours",
						"resources",
						"resourceFiles",
						"memberProfilePhotos",
					] as const
				).map(
					async (kind): Promise<[string, number]> => [
						kind,
						(
							await ctx.db
								.query(kind)
								.withIndex("by_club", (q) => q.eq("clubId", owner.clubId))
								.collect()
						).length,
					],
				),
			),
		);
		return {
			clubId: owner.clubId,
			ownerId: owner.userId,
			references: refs.map(({ sourceId, kind, targetId }) => ({
				sourceId,
				kind,
				targetId,
			})),
			counts: Object.fromEntries(
				[...new Set(refs.map((row) => row.kind))].map((kind) => [
					kind,
					refs.filter((row) => row.kind === kind).length,
				]),
			),
			archived: archive.length,
			actualCounts,
			deliveryDisabled: true,
		};
	},
});
