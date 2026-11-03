import type { Doc } from "./_generated/dataModel";

export type MondayEvent = Doc<"events">["value"];
export type MondayResponse = Doc<"responses">["value"];
export type MondayPair = { sourceId: string; targetId: string; date: string };

export const migrationMondaySnapshot = (value: unknown): string => {
	if (Array.isArray(value))
		return `[${value.map(migrationMondaySnapshot).join(",")}]`;
	if (typeof value === "object" && value !== null)
		return `{${Object.entries(value)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(
				([key, entry]) =>
					`${JSON.stringify(key)}:${migrationMondaySnapshot(entry)}`,
			)
			.join(",")}}`;
	return JSON.stringify(value) ?? "undefined";
};

const mondayPractice = (event: MondayEvent): boolean =>
	new Date(`${event.date}T12:00:00Z`).getUTCDay() === 1 &&
	(event.kind === "training" || event.kind === "hockey");
const minutes = (time: string): number => {
	if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return Number.NaN;
	const [hours, rest] = time.split(":").map(Number);
	return (hours ?? Number.NaN) * 60 + (rest ?? Number.NaN);
};

export const migrationMondayPairs = (
	events: readonly MondayEvent[],
): MondayPair[] => {
	const practices = events.filter(mondayPractice);
	return practices
		.filter((event) => event.id.startsWith("base44:Event:"))
		.flatMap((source): MondayPair[] => {
			const sameProgram = practices.filter(
				(event) =>
					event.date === source.date && event.program === source.program,
			);
			const sources = sameProgram.filter((event) =>
				event.id.startsWith("base44:Event:"),
			);
			const targets = sameProgram.filter((event) =>
				event.id.startsWith("sporteasy:"),
			);
			const target = targets.at(0);
			return sources.length === 1 &&
				targets.length === 1 &&
				target &&
				Math.abs(minutes(source.start) - minutes(target.start)) <= 10
				? [{ sourceId: source.id, targetId: target.id, date: source.date }]
				: [];
		})
		.sort(
			(left, right) =>
				left.date.localeCompare(right.date) ||
				left.sourceId.localeCompare(right.sourceId),
		);
};

export const migrationMondayResponse = (
	source: MondayResponse,
	target: MondayResponse | undefined,
	sourceBaseline: MondayResponse | undefined,
	targetBaseline: MondayResponse | undefined,
	targetEventId: string,
): MondayResponse => {
	if (!target)
		return {
			...source,
			id: `${targetEventId}:${source.personId}`,
			eventId: targetEventId,
		};
	if (source.personId !== target.personId)
		throw new Error("Monday reconciliation cannot combine different players.");
	const field = <Key extends keyof MondayResponse>(
		key: Key,
		preferred: MondayResponse[Key],
	): MondayResponse[Key] => {
		const sourceEdited =
			!sourceBaseline ||
			migrationMondaySnapshot(source[key]) !==
				migrationMondaySnapshot(sourceBaseline[key]);
		const targetEdited =
			!targetBaseline ||
			migrationMondaySnapshot(target[key]) !==
				migrationMondaySnapshot(targetBaseline[key]);
		if (
			sourceEdited &&
			targetEdited &&
			migrationMondaySnapshot(source[key]) !==
				migrationMondaySnapshot(target[key])
		)
			throw new Error(`Conflicting manual Monday response edits: ${key}`);
		return sourceEdited ? source[key] : targetEdited ? target[key] : preferred;
	};
	return {
		id: `${targetEventId}:${source.personId}`,
		eventId: targetEventId,
		personId: source.personId,
		response: field("response", source.response),
		attendance: field(
			"attendance",
			target.attendance === "unmarked" ? source.attendance : target.attendance,
		),
		absenceReason: field(
			"absenceReason",
			source.absenceReason ?? target.absenceReason,
		),
		partIds: field("partIds", source.partIds ?? target.partIds),
		partAttendance: field(
			"partAttendance",
			source.partAttendance ?? target.partAttendance,
		),
		seriesExpected: field(
			"seriesExpected",
			source.seriesExpected ?? target.seriesExpected,
		),
		seriesInvitedAt: field(
			"seriesInvitedAt",
			source.seriesInvitedAt ?? target.seriesInvitedAt,
		),
	};
};
