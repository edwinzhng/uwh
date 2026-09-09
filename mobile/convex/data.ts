import type { AppData } from "../src/domain/app-types";
import { initialSeasons } from "../src/domain/seasons";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type EntityTable =
	| "members"
	| "events"
	| "responses"
	| "teams"
	| "plans"
	| "feedback"
	| "conversations"
	| "messages"
	| "notices"
	| "equipment"
	| "loans"
	| "charges"
	| "payments"
	| "trackers"
	| "trackerValues";
export type Rows = { [K in EntityTable]: Doc<K>[] };
export type DataSelection = Partial<Record<EntityTable, true | string[]>>;
export type DataScope = { select: DataSelection; rows?: Partial<Rows> };
const selectedRows = async <T extends EntityTable>(
	table: T,
	scope: boolean | DataScope,
	all: () => Promise<Doc<T>[]>,
	one: (id: string) => Promise<Doc<T> | null>,
): Promise<Doc<T>[]> => {
	const preset = typeof scope === "object" ? scope.rows?.[table] : undefined;
	if (preset) return preset;
	const selected =
		typeof scope === "object"
			? scope.select[table]
			: table !== "messages" || scope;
	if (!selected) return [];
	if (selected === true) return all();
	return (await Promise.all([...new Set(selected)].map(one))).filter(
		(row) => row !== null,
	);
};
export const loadData = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	scope: boolean | DataScope = false,
): Promise<{ rows: Rows; data: AppData }> => {
	const club = await ctx.db.get(clubId);
	if (!club) throw new Error("Club not found.");
	const [
		members,
		events,
		responses,
		teams,
		plans,
		feedback,
		conversations,
		messages,
		notices,
		equipment,
		loans,
		charges,
		payments,
		trackers,
		trackerValues,
	] = await Promise.all([
		selectedRows(
			"members",
			scope,
			() =>
				ctx.db
					.query("members")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"events",
			scope,
			() =>
				ctx.db
					.query("events")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("events")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"responses",
			scope,
			() =>
				ctx.db
					.query("responses")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("responses")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"teams",
			scope,
			() =>
				ctx.db
					.query("teams")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("teams")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"plans",
			scope,
			() =>
				ctx.db
					.query("plans")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("plans")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"feedback",
			scope,
			() =>
				ctx.db
					.query("feedback")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("feedback")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"conversations",
			scope,
			() =>
				ctx.db
					.query("conversations")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("conversations")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"messages",
			scope,
			() =>
				ctx.db
					.query("messages")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("messages")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"notices",
			scope,
			() =>
				ctx.db
					.query("notices")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("notices")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"equipment",
			scope,
			() =>
				ctx.db
					.query("equipment")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("equipment")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"loans",
			scope,
			() =>
				ctx.db
					.query("loans")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("loans")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"charges",
			scope,
			() =>
				ctx.db
					.query("charges")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("charges")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"payments",
			scope,
			() =>
				ctx.db
					.query("payments")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("payments")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"trackers",
			scope,
			() =>
				ctx.db
					.query("trackers")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("trackers")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
		selectedRows(
			"trackerValues",
			scope,
			() =>
				ctx.db
					.query("trackerValues")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect(),
			(id) =>
				ctx.db
					.query("trackerValues")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", clubId).eq("value.id", id),
					)
					.unique(),
		),
	]);
	return {
		rows: {
			members,
			events,
			responses,
			teams,
			plans,
			feedback,
			conversations,
			messages,
			notices,
			equipment,
			loans,
			charges,
			payments,
			trackers,
			trackerValues,
		},
		data: {
			clubName: club.name,
			seasons: club.seasons ?? initialSeasons,
			reminders: club.reminders,
			members: members.map((row) => row.value),
			events: events.map((row) => ({
				...row.value,
				seasonId: row.value.seasonId ?? "2026-2027",
			})),
			responses: responses.map((row) => row.value),
			teams: teams.map((row) => row.value),
			plans: Object.fromEntries(
				plans.map((row) => [row.value.id, row.value.body]),
			),
			feedback: feedback.map((row) => row.value),
			conversations: conversations.map((row) => row.value),
			messages: messages.map((row) => row.value),
			notices: notices.map((row) => row.value),
			equipment: equipment.map((row) => row.value),
			loans: loans.map((row) => row.value),
			charges: charges.map((row) => row.value),
			payments: payments.map((row) => row.value),
			paymentTotals: Object.fromEntries(
				charges.flatMap((row) =>
					typeof row.paidTotal === "number"
						? [[row.value.personId, row.paidTotal]]
						: [],
				),
			),
			trackers: trackers.map((row) =>
				row.value.id === "membership"
					? {
							...row.value,
							name: "CUGA membership",
							kind: "check",
							program: "all",
						}
					: row.value,
			),
			trackerValues: Object.fromEntries(
				trackerValues.map((row) => [
					row.value.id,
					row.value.id.startsWith("membership:")
						? ["yes", "active", "true"].includes(row.value.value.toLowerCase())
							? "yes"
							: ""
						: row.value.value,
				]),
			),
		},
	};
};
const changed = <T extends { id: string }, I>(
	rows: { _id: I; value: T }[],
	values: T[],
): { inserts: T[]; updates: { id: I; value: T }[] } => {
	const byId = new Map(rows.map((row) => [row.value.id, row]));
	return {
		inserts: values.filter((value) => !byId.has(value.id)),
		updates: values.flatMap((value) => {
			const previous = byId.get(value.id);
			return previous &&
				JSON.stringify(previous.value) !== JSON.stringify(value)
				? [{ id: previous._id, value }]
				: [];
		}),
	};
};
export const saveData = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	rows: Rows,
	data: AppData,
): Promise<void> => {
	const club = await ctx.db.get(clubId);
	if (!club) throw new Error("Club not found.");
	if (
		club.name !== data.clubName ||
		club.reminders !== data.reminders ||
		JSON.stringify(club.seasons ?? initialSeasons) !==
			JSON.stringify(data.seasons)
	)
		await ctx.db.patch(clubId, {
			name: data.clubName,
			seasons: data.seasons,
			reminders: data.reminders,
		});

	const membersChanges = changed(rows.members, data.members);
	for (const value of membersChanges.inserts)
		await ctx.db.insert("members", { clubId, value });
	for (const entry of membersChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const eventsChanges = changed(rows.events, data.events);
	for (const value of eventsChanges.inserts)
		await ctx.db.insert("events", { clubId, value });
	for (const entry of eventsChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const responsesChanges = changed(
		rows.responses,
		data.responses.map((entry) => ({
			...entry,
			id: `${entry.eventId}:${entry.personId}`,
		})),
	);
	for (const value of responsesChanges.inserts)
		await ctx.db.insert("responses", { clubId, value });
	for (const entry of responsesChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const teamsChanges = changed(
		rows.teams,
		data.teams.map((entry) => ({ ...entry, id: entry.eventId })),
	);
	for (const value of teamsChanges.inserts)
		await ctx.db.insert("teams", { clubId, value });
	for (const entry of teamsChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const plansChanges = changed(
		rows.plans,
		Object.entries(data.plans).map(([id, body]) => ({ id, body })),
	);
	for (const value of plansChanges.inserts)
		await ctx.db.insert("plans", { clubId, value });
	for (const entry of plansChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const feedbackChanges = changed(rows.feedback, data.feedback);
	for (const row of rows.feedback.filter(
		(entry) => !data.feedback.some((item) => item.id === entry.value.id),
	))
		await ctx.db.delete(row._id);
	for (const value of feedbackChanges.inserts)
		await ctx.db.insert("feedback", { clubId, value });
	for (const entry of feedbackChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const conversationsChanges = changed(rows.conversations, data.conversations);
	for (const value of conversationsChanges.inserts)
		await ctx.db.insert("conversations", { clubId, value });
	for (const entry of conversationsChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const messagesChanges = changed(rows.messages, data.messages);
	for (const value of messagesChanges.inserts)
		await ctx.db.insert("messages", { clubId, value });
	for (const entry of messagesChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const noticesChanges = changed(rows.notices, data.notices);
	for (const value of noticesChanges.inserts)
		await ctx.db.insert("notices", { clubId, value });
	for (const entry of noticesChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const equipmentChanges = changed(rows.equipment, data.equipment);
	for (const value of equipmentChanges.inserts)
		await ctx.db.insert("equipment", { clubId, value });
	for (const entry of equipmentChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const loansChanges = changed(rows.loans, data.loans);
	for (const value of loansChanges.inserts)
		await ctx.db.insert("loans", { clubId, value });
	for (const entry of loansChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const chargesChanges = changed(
		rows.charges,
		data.charges.map((entry) => ({ ...entry, id: entry.personId })),
	);
	for (const value of chargesChanges.inserts)
		await ctx.db.insert("charges", {
			clubId,
			value,
			paidTotal: data.payments
				.filter((payment) => payment.personId === value.personId)
				.reduce((sum, payment) => sum + payment.amount, 0),
		});
	for (const entry of chargesChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const paymentsChanges = changed(rows.payments, data.payments);
	for (const value of paymentsChanges.inserts)
		await ctx.db.insert("payments", { clubId, value });
	for (const entry of paymentsChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	for (const charge of rows.charges) {
		const inserted = paymentsChanges.inserts.filter(
			(payment) => payment.personId === charge.value.personId,
		);
		if (inserted.length)
			await ctx.db.patch(charge._id, {
				paidTotal:
					(charge.paidTotal ??
						rows.payments
							.filter(
								(payment) => payment.value.personId === charge.value.personId,
							)
							.reduce((sum, row) => sum + row.value.amount, 0)) +
					inserted.reduce((sum, payment) => sum + payment.amount, 0),
			});
	}
	const trackersChanges = changed(rows.trackers, data.trackers);
	for (const value of trackersChanges.inserts)
		await ctx.db.insert("trackers", { clubId, value });
	for (const entry of trackersChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
	const trackerValuesChanges = changed(
		rows.trackerValues,
		Object.entries(data.trackerValues).map(([id, value]) => ({ id, value })),
	);
	for (const value of trackerValuesChanges.inserts)
		await ctx.db.insert("trackerValues", { clubId, value });
	for (const entry of trackerValuesChanges.updates)
		await ctx.db.patch(entry.id, { value: entry.value });
};
