import { createOccurrences } from "../src/domain/app-rules";
import { applyLedgerChange } from "../src/domain/season-ledger";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { ImportInput, ImportPlan } from "./import_plan";
import { readSeasonRecord, saveSeasonRecord } from "./season_records";
import { scheduleSignup } from "./signup";

export const applyImportRow = async (
	ctx: MutationCtx,
	actor: Doc<"memberships">,
	input: ImportInput,
	plan: ImportPlan,
): Promise<void> => {
	const record = plan.record;
	const targetId = plan.targetId;
	if (!record || !targetId || plan.status === "error")
		throw new Error("Review errors before importing.");
	if (plan.status === "skip") return;
	const clubId = actor.clubId;
	if (plan.status === "create") {
		if (record.kind === "members")
			await ctx.db.insert("members", {
				clubId,
				value: {
					id: targetId,
					name: record.name,
					programs: ["club"],
					position: "",
					rating: 3,
					registration: "missing",
					goal: "",
					steps: 0,
				},
			});
		else if (record.kind === "events") {
			const event = createOccurrences(
				`import:${input.source}:${encodeURIComponent(record.sourceId)}`,
				record.draft,
			).at(0);
			if (!event) throw new Error("Event unavailable.");
			await ctx.db.insert("events", { clubId, value: event });
			await scheduleSignup(ctx, clubId, event);
		} else if (record.kind === "attendance") {
			if (!plan.personId || !plan.eventId)
				throw new Error("Choose an event and member.");
			const existing = await ctx.db
				.query("responses")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", clubId).eq("value.id", targetId),
				)
				.unique();
			if (existing)
				throw new Error("Duplicate attendance for this member and event.");
			const event = await ctx.db
				.query("events")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", clubId).eq("value.id", plan.eventId ?? ""),
				)
				.unique();
			const responses = await ctx.db
				.query("responses")
				.withIndex("by_event", (q) =>
					q.eq("clubId", clubId).eq("value.eventId", plan.eventId ?? ""),
				)
				.collect();
			if (
				record.response === "going" &&
				responses.filter((row) => row.value.response === "going").length >=
					(event?.value.capacity ?? Infinity)
			)
				throw new Error(
					"Attendance exceeds event capacity. Update capacity first.",
				);
			await ctx.db.insert("responses", {
				clubId,
				value: {
					id: targetId,
					personId: plan.personId,
					eventId: plan.eventId,
					response: record.response,
					attendance: record.attendance,
				},
			});
		} else {
			if (!plan.personId) throw new Error("Choose a member.");
			const before = await readSeasonRecord(
				ctx,
				clubId,
				input.seasonId,
				plan.personId,
			);
			const after =
				record.kind === "registration"
					? {
							...before,
							registration: record.status,
							cuga: record.cuga,
							due: record.dues,
							revision: before.revision + 1,
						}
					: applyLedgerChange(before, {
							kind: "payment",
							amount: record.amount,
							note: record.note,
							date: record.date,
						});
			await saveSeasonRecord(ctx, clubId, after);
			await ctx.db.insert("seasonLedger", {
				clubId,
				personId: plan.personId,
				seasonId: input.seasonId,
				key: targetId,
				kind: record.kind === "registration" ? "registration" : "payment",
				amount: record.kind === "registration" ? record.dues : record.amount,
				note:
					record.kind === "registration"
						? `Imported registration: ${record.status} · CUGA: ${record.cuga ? "Yes" : "No"} · dues ${record.dues / 100} CAD`
						: record.note,
				date:
					record.kind === "payments"
						? record.date
						: new Date().toISOString().slice(0, 10),
				actor: actor.name,
				actorId: actor.userId,
				createdAt: Date.now(),
				before: JSON.stringify(before),
				after: JSON.stringify(after),
			});
		}
	}
	await ctx.db.insert("importReferences", {
		clubId,
		source: input.source,
		kind: input.kind,
		sourceId: record.sourceId,
		seasonId: input.kind === "registration" ? input.seasonId : undefined,
		targetId,
		fingerprint: JSON.stringify(record),
		personId: record.kind === "members" ? targetId : plan.personId,
	});
};
