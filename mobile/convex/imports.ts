import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireMember } from "./identity";
import { applyImportRow } from "./import_apply";
import { type ImportPlan, importSignature, planImport } from "./import_plan";
import { importKindValue } from "./import_schema";

const fields = {
	source: v.string(),
	kind: importKindValue,
	seasonId: v.string(),
	rows: v.array(v.record(v.string(), v.string())),
};
export const preview = query({
	args: fields,
	handler: async (
		ctx,
		input,
	): Promise<{ plans: ImportPlan[]; signature: string }> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		const plans = await planImport(ctx, actor.clubId, input);
		return { plans, signature: importSignature(plans) };
	},
});
export const commit = mutation({
	args: { ...fields, expected: v.string(), key: v.string() },
	handler: async (
		ctx,
		input,
	): Promise<{ created: number; skipped: number }> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		const previous = await ctx.db
			.query("importRuns")
			.withIndex("by_club_key", (q) =>
				q.eq("clubId", actor.clubId).eq("key", input.key),
			)
			.unique();
		if (previous)
			return { created: previous.created, skipped: previous.skipped };
		const plans = await planImport(ctx, actor.clubId, input);
		if (importSignature(plans) !== input.expected)
			throw new Error(
				"Records changed after preview. Preview again before importing.",
			);
		if (plans.some((plan) => plan.status === "error"))
			throw new Error("Fix the highlighted rows first.");
		for (const plan of plans) await applyImportRow(ctx, actor, input, plan);
		const created = plans.filter((plan) => plan.status === "create").length;
		const skipped = plans.length - created;
		await ctx.db.insert("importRuns", {
			clubId: actor.clubId,
			source: input.source,
			kind: input.kind,
			key: input.key,
			actor: actor.name,
			actorId: actor.userId,
			createdAt: Date.now(),
			created,
			skipped,
		});
		return { created, skipped };
	},
});
export const history = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, args): Promise<PaginationResult<Doc<"importRuns">>> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		return ctx.db
			.query("importRuns")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.order("desc")
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(args.paginationOpts.numItems, 30),
			});
	},
});
export const directory = query({
	args: {
		kind: v.union(v.literal("members"), v.literal("events")),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		args,
	): Promise<PaginationResult<{ id: string; name: string }>> => {
		const actor = await requireMember(ctx);
		if (!actor.admin) throw new Error("Administrator access required.");
		if (args.kind === "members") {
			const result = await ctx.db
				.query("members")
				.withIndex("by_name", (q) => q.eq("clubId", actor.clubId))
				.paginate({
					...args.paginationOpts,
					numItems: Math.min(args.paginationOpts.numItems, 100),
				});
			return {
				...result,
				page: result.page.map((row) => ({
					id: row.value.id,
					name: row.value.name,
				})),
			};
		}
		const result = await ctx.db
			.query("events")
			.withIndex("by_date", (q) => q.eq("clubId", actor.clubId))
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(args.paginationOpts.numItems, 100),
			});
		return {
			...result,
			page: result.page.map((row) => ({
				id: row.value.id,
				name: `${row.value.date} ${row.value.start} ${row.value.title}`,
			})),
		};
	},
});
