import type { SeasonRecord } from "./season-ledger";

export type SeasonHistoryEntry = {
	id: string;
	personId: string;
	seasonId: string;
	kind: "payment" | "refund" | "dues" | "registration";
	amount: number;
	note: string;
	date: string;
	actor: string;
	before?: string;
	after?: string;
};

type RegistrationSnapshot = Pick<
	SeasonRecord,
	"personId" | "seasonId" | "registration" | "cuga"
>;

export type SeasonHistoryEvent = {
	id: string;
	title: string;
	note?: string;
	amount?: number;
	date: string;
	actor: string;
};

const registrationSnapshot = (
	serialized: string | undefined,
): RegistrationSnapshot | undefined => {
	if (!serialized) return undefined;
	try {
		const value: unknown = JSON.parse(serialized);
		if (
			typeof value !== "object" ||
			value === null ||
			!("personId" in value) ||
			typeof value.personId !== "string" ||
			!("seasonId" in value) ||
			typeof value.seasonId !== "string" ||
			!("cuga" in value) ||
			typeof value.cuga !== "boolean" ||
			!("registration" in value) ||
			(value.registration !== "missing" &&
				value.registration !== "submitted" &&
				value.registration !== "approved")
		)
			return undefined;
		return {
			personId: value.personId,
			seasonId: value.seasonId,
			registration: value.registration,
			cuga: value.cuga,
		};
	} catch {
		return undefined;
	}
};

const registrationChanges = (
	entry: SeasonHistoryEntry,
): string[] | undefined => {
	const before = registrationSnapshot(entry.before);
	const after = registrationSnapshot(entry.after);
	if (
		!before ||
		!after ||
		before.personId !== entry.personId ||
		after.personId !== entry.personId ||
		before.seasonId !== entry.seasonId ||
		after.seasonId !== entry.seasonId
	)
		return undefined;
	return [
		...(before.registration !== after.registration
			? [
					after.registration === "approved"
						? "Registration approved"
						: after.registration === "submitted"
							? "Registration submitted"
							: "Registration marked missing",
				]
			: []),
		...(before.cuga !== after.cuga
			? [after.cuga ? "CUGA membership confirmed" : "CUGA membership removed"]
			: []),
	];
};

export const seasonHistoryEvents = (
	entries: SeasonHistoryEntry[],
): SeasonHistoryEvent[] =>
	entries.flatMap((entry) => {
		const changes =
			entry.kind === "registration" ? registrationChanges(entry) : undefined;
		if (changes && !changes.length) return [];
		return [
			{
				id: entry.id,
				title:
					entry.kind === "registration"
						? (changes?.join(" · ") ?? "Registration updated")
						: entry.kind === "payment"
							? "Payment recorded"
							: entry.kind === "refund"
								? "Refund recorded"
								: "Season dues set",
				note:
					entry.kind === "registration"
						? undefined
						: entry.note.trim() || undefined,
				amount:
					entry.kind === "registration"
						? undefined
						: entry.amount * (entry.kind === "refund" ? -1 : 1),
				date: entry.date,
				actor: entry.actor,
			},
		];
	});
