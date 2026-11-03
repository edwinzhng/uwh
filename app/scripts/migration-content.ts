import type { Doc, Id } from "../convex/_generated/dataModel";

type SourceRow = Readonly<Record<string, string>>;
type ImportValue<
	Table extends
		| "developmentReviews"
		| "developmentRounds"
		| "goalReflections"
		| "sessionPerformance"
		| "sessionCheckins",
> = Omit<Doc<Table>, "_id" | "_creationTime" | "clubId">;
export type MigrationEnvelope<Value> = { sourceId: string; value: Value };
type Session = { id: string; date: string; title: string };
export type MigrationContentInput = {
	tables: Readonly<Record<string, readonly Record<string, string>[]>>;
	person: (base44PlayerId: string) => string;
	author: (name: string, email?: string) => Id<"users">;
	session: (programId: string, number: string) => Session | undefined;
	program: (id: string) => string;
};
type Performance = ImportValue<"sessionPerformance">;
type Checkin = ImportValue<"sessionCheckins">;
export type UnlinkedMigrationContent =
	| {
			sourceId: string;
			table: "PlayerSessionFeedback";
			sourceProgramId: string;
			sourceSessionNumber: string;
			value: Omit<Performance, "eventId" | "eventDate" | "eventTitle">;
	  }
	| {
			sourceId: string;
			table: "SessionCheckin";
			sourceProgramId: string;
			sourceSessionNumber: string;
			value: Omit<Checkin, "eventId">;
	  };
export type MigrationContent = {
	feedback: MigrationEnvelope<Doc<"feedback">["value"]>[];
	reviews: MigrationEnvelope<ImportValue<"developmentReviews">>[];
	rounds: MigrationEnvelope<ImportValue<"developmentRounds">>[];
	reflections: MigrationEnvelope<ImportValue<"goalReflections">>[];
	performance: MigrationEnvelope<Performance>[];
	checkins: MigrationEnvelope<Checkin>[];
	unlinked: UnlinkedMigrationContent[];
};

const required = (row: SourceRow, key: string, sourceId: string): string => {
	const value = row[key]?.trim();
	if (!value) throw new Error(`${sourceId}: missing ${key}`);
	return value;
};
const number = (
	value: string | number,
	sourceId: string,
	field: string,
	min: number,
	max: number,
): number => {
	const parsed =
		typeof value === "number"
			? value
			: value.trim()
				? Number(value)
				: Number.NaN;
	if (!Number.isFinite(parsed) || parsed < min || parsed > max)
		throw new Error(`${sourceId}: invalid ${field}`);
	return parsed;
};
const timestamp = (
	row: SourceRow,
	sourceId: string,
	updated = false,
): number => {
	const value = updated
		? row.updated_date || row.created_date
		: row.created_date;
	const parsed = Date.parse(value ?? "");
	if (!Number.isFinite(parsed))
		throw new Error(`${sourceId}: invalid source timestamp`);
	return parsed;
};
const category = (
	value: string,
	sourceId: string,
): NonNullable<Doc<"feedback">["value"]["category"]> => {
	if (value === "Really stood out tonight") return "stood_out";
	if (value === "Had a great session") return "great_session";
	if (value === "Played above their usual level") return "above_usual";
	if (value === "MVP of the session") return "mvp";
	throw new Error(`${sourceId}: unsupported shoutout category`);
};
type Progress = { sessionNumber: string; note: string; rating: number };
const progressJson = (value: string, sourceId: string): unknown => {
	try {
		return JSON.parse(value);
	} catch {
		throw new Error(`${sourceId}: invalid goal progress JSON`);
	}
};
const progressEntries = (row: SourceRow, sourceId: string): Progress[] => {
	const values = progressJson(row.goal_progress || "[]", sourceId);
	if (!Array.isArray(values))
		throw new Error(`${sourceId}: invalid goal progress`);
	return values.map((entry: unknown): Progress => {
		if (
			typeof entry !== "object" ||
			!entry ||
			!("session_number" in entry) ||
			!("progress_note" in entry) ||
			!("rating" in entry) ||
			typeof entry.progress_note !== "string" ||
			typeof entry.rating !== "number" ||
			(typeof entry.session_number !== "number" &&
				typeof entry.session_number !== "string")
		)
			throw new Error(`${sourceId}: invalid goal progress entry`);
		return {
			sessionNumber: String(entry.session_number),
			note: entry.progress_note,
			rating: number(entry.rating, sourceId, "reflection rating", 1, 5),
		};
	});
};

export const buildMigrationContent = ({
	tables,
	person,
	author,
	session,
	program,
}: MigrationContentInput): MigrationContent => {
	const rows = (table: string): readonly SourceRow[] => tables[table] ?? [];
	const players = rows("Player");
	const player = (id: string, sourceId: string): SourceRow => {
		const found = players.find((entry) => entry.id === id);
		if (!found) throw new Error(`${sourceId}: unresolved player`);
		return found;
	};
	const emailPlayer = (email: string | undefined): SourceRow | undefined => {
		if (!email?.trim()) return undefined;
		const matches = players.filter(
			(entry) =>
				entry.email?.trim().toLowerCase() === email.trim().toLowerCase(),
		);
		return matches.length === 1 ? matches.at(0) : undefined;
	};
	const playerAuthor = (row: SourceRow): Id<"users"> =>
		author(row.full_name ?? "", row.email || undefined);
	const feedback = rows("ShoutOut").map(
		(row): MigrationEnvelope<Doc<"feedback">["value"]> => {
			const sourceId = `ShoutOut:${required(row, "id", "ShoutOut")}`;
			const from = player(required(row, "from_player_id", sourceId), sourceId);
			const linked = session(row.program_id ?? "", row.session_number ?? "");
			return {
				sourceId,
				value: {
					id: sourceId,
					kind: "shoutout",
					personId: person(required(row, "to_player_id", sourceId)),
					authorId: playerAuthor(from),
					eventId: linked?.id,
					category: category(row.shoutout_type ?? "", sourceId),
					body: row.note ?? "",
					visibility: "published",
					date: new Date(timestamp(row, sourceId)).toISOString().slice(0, 10),
				},
			};
		},
	);
	const reviews = rows("PlayerScore").map(
		(row): MigrationEnvelope<ImportValue<"developmentReviews">> => {
			const sourceId = `PlayerScore:${required(row, "id", "PlayerScore")}`;
			const coach = emailPlayer(row.coach_email);
			const coachId = author(
				coach?.full_name || row.coach_name || "",
				row.coach_email || undefined,
			);
			return {
				sourceId,
				value: {
					personId: person(required(row, "player_id", sourceId)),
					round: number(
						required(row, "round", sourceId),
						sourceId,
						"round",
						1,
						Number.MAX_SAFE_INTEGER,
					),
					coachId,
					revision: 0,
					status: "submitted",
					rating: number(
						required(row, "score", sourceId),
						sourceId,
						"score",
						0,
						100,
					),
					observation: "",
					updatedAt: timestamp(row, sourceId, true),
				},
			};
		},
	);
	const reviewGroups = Map.groupBy(
		reviews,
		(entry) => `${entry.value.personId}:${entry.value.round}`,
	);
	const rounds = [...reviewGroups.values()].map(
		(entries): MigrationEnvelope<ImportValue<"developmentRounds">> => {
			const first = entries.at(0);
			if (!first) throw new Error("Empty source review round");
			return {
				sourceId: `PlayerScoreRound:${first.value.personId}:${first.value.round}`,
				value: {
					personId: first.value.personId,
					round: first.value.round,
					revision: 0,
					status: "open",
					requiredCoachIds: [
						...new Set(entries.map((entry) => entry.value.coachId)),
					],
					profileRevision: 0,
					updatedAt: Math.max(...entries.map((entry) => entry.value.updatedAt)),
				},
			};
		},
	);
	const reflections = players.flatMap(
		(row): MigrationEnvelope<ImportValue<"goalReflections">>[] => {
			const sourceId = `Player:${required(row, "id", "Player")}`;
			return progressEntries(row, sourceId).map((entry, index) => {
				const key = `${sourceId}:goal_progress:${index}`;
				const goal = row.focus_goal_custom?.trim() || row.focus_goal?.trim();
				if (!goal) throw new Error(`${key}: missing source goal`);
				return {
					sourceId: key,
					value: {
						personId: person(required(row, "id", sourceId)),
						authorId: playerAuthor(row),
						requestId: key,
						goal,
						note: entry.note,
						selfRating: entry.rating,
						createdAt: timestamp(row, sourceId, true),
						checkIn: index + 1,
					},
				};
			});
		},
	);
	const performanceRows = rows("PlayerSessionFeedback").map((row) => {
		const sourceId = `PlayerSessionFeedback:${required(row, "id", "PlayerSessionFeedback")}`;
		if (row.type !== "player_self_rating")
			throw new Error(`${sourceId}: unsupported session feedback type`);
		const owner = player(required(row, "player_id", sourceId), sourceId);
		const value: Omit<Performance, "eventId" | "eventDate" | "eventTitle"> = {
			personId: person(required(row, "player_id", sourceId)),
			programId: program(row.program_id ?? ""),
			sessionNumber: number(
				required(row, "session_number", sourceId),
				sourceId,
				"session number",
				1,
				Number.MAX_SAFE_INTEGER,
			),
			kind: "self",
			authorKey: "self",
			authorId: playerAuthor(owner),
			authorName: owner.full_name ?? "",
			rating: number(
				required(row, "rating", sourceId),
				sourceId,
				"session rating",
				1,
				10,
			),
			comments: row.comments ?? "",
			revision: 0,
			updatedAt: timestamp(row, sourceId, true),
		};
		return {
			sourceId,
			row,
			value,
			linked: session(row.program_id ?? "", row.session_number ?? ""),
		};
	});
	const checkinRows = rows("SessionCheckin").map((row) => {
		const sourceId = `SessionCheckin:${required(row, "id", "SessionCheckin")}`;
		const owner = player(required(row, "player_id", sourceId), sourceId);
		const actor = emailPlayer(row.created_by);
		const energy =
			row.energy_level === "tired"
				? 1
				: row.energy_level === "average"
					? 3
					: row.energy_level === "great"
						? 5
						: undefined;
		if (energy === undefined)
			throw new Error(`${sourceId}: unsupported energy level`);
		const value: Omit<Checkin, "eventId"> = {
			personId: person(required(row, "player_id", sourceId)),
			energy,
			note: "",
			actorId: row.created_by
				? author(actor?.full_name ?? "", row.created_by)
				: playerAuthor(owner),
			updatedAt: timestamp(row, sourceId, true),
		};
		return {
			sourceId,
			row,
			value,
			linked: session(row.program_id ?? "", row.session_number ?? ""),
		};
	});
	return {
		feedback,
		reviews,
		rounds,
		reflections,
		performance: performanceRows.flatMap(({ sourceId, value, linked }) =>
			linked
				? [
						{
							sourceId,
							value: {
								...value,
								eventId: linked.id,
								eventDate: linked.date,
								eventTitle: linked.title,
							},
						},
					]
				: [],
		),
		checkins: checkinRows.flatMap(({ sourceId, value, linked }) =>
			linked ? [{ sourceId, value: { ...value, eventId: linked.id } }] : [],
		),
		unlinked: [
			...performanceRows.flatMap(
				({ sourceId, row, value, linked }): UnlinkedMigrationContent[] =>
					linked
						? []
						: [
								{
									sourceId,
									table: "PlayerSessionFeedback",
									sourceProgramId: row.program_id ?? "",
									sourceSessionNumber: row.session_number ?? "",
									value,
								},
							],
			),
			...checkinRows.flatMap(
				({ sourceId, row, value, linked }): UnlinkedMigrationContent[] =>
					linked
						? []
						: [
								{
									sourceId,
									table: "SessionCheckin",
									sourceProgramId: row.program_id ?? "",
									sourceSessionNumber: row.session_number ?? "",
									value,
								},
							],
			),
		],
	};
};
