import { Temporal } from "@js-temporal/polyfill";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { programRoomId } from "../src/domain/managed-rooms";
import { type SourceRow, sourceArray, sourceDate } from "./migration-source";

type EventValue = Doc<"events">["value"];
type Entry<Value> = { sourceId: string; value: Value };
type ResourceValue = Omit<Doc<"resources">, "_id" | "_creationTime" | "clubId">;
type Actor = { name: string; email: string; sourceUserId?: string };
type Unlinked = { sourceId: string; feature: string; reason: string };
type SourceAssignment = {
	player_id: string;
	player_name?: string;
	position?: string;
	cap_number?: number;
};
type Reaction = { emoji: string; user_emails?: string[]; user_ids?: string[] };
type Input = {
	tables: Record<string, SourceRow[]>;
	person: (base44PlayerId: string) => string;
	author: (name: string, emailOrOpaqueSourceKey: string) => Id<"users">;
	program: (base44ProgramId: string) => string;
	event: (sourceKey: string) => EventValue | undefined;
	currentOwnerId: Id<"users">;
	image?: (
		sourceMessageId: string,
		url: string,
	) => { id: string; name: string } | undefined;
};

const timestamp = (value: string | undefined): number => {
	if (!value) throw new Error("Missing communication source timestamp.");
	return Temporal.Instant.from(
		/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`,
	).epochMilliseconds;
};
const formation = (
	value: string | undefined,
): "1-3-2" | "2-3-1" | "3-3" | undefined =>
	value === "1-3-2" || value === "2-3-1" || value === "3-3" ? value : undefined;
const slot = (position: string, shape: string): number | undefined => {
	const positions =
		shape === "2-3-1"
			? ["LF", "RF", "LW", "C", "RW", "FB"]
			: shape === "1-3-2"
				? ["CF", "LW", "C", "RW", "LFB", "RFB"]
				: [];
	const index = positions.indexOf(position);
	return index < 0 ? undefined : index;
};

export const buildMigrationCommunication = ({
	tables,
	person,
	author,
	program,
	event,
	currentOwnerId,
	image,
}: Input): {
	conversations: Entry<Doc<"conversations">["value"]>[];
	messages: Entry<Doc<"messages">["value"]>[];
	notices: Entry<Doc<"notices">["value"]>[];
	teams: Entry<Doc<"teams">["value"]>[];
	resources: Entry<ResourceValue>[];
	requiredActors: Actor[];
	unlinked: Unlinked[];
	summary: Record<string, number>;
} => {
	const conversations = new Map<string, Entry<Doc<"conversations">["value"]>>();
	const messages: Entry<Doc<"messages">["value"]>[] = [];
	const notices: Entry<Doc<"notices">["value"]>[] = [];
	const teams: Entry<Doc<"teams">["value"]>[] = [];
	const resources: Entry<ResourceValue>[] = [];
	const unlinked: Unlinked[] = [];
	const requiredActors = new Map<string, Actor>();
	const players = tables.Player ?? [];
	const memberships = tables.ProgramMembership ?? [];
	const chats = tables.ChatMessage ?? [];
	const direct = tables.DirectMessage ?? [];
	const sourceParticipants = new Map<
		string,
		{ name: string; email: string; id: string }
	>();
	for (const row of tables.DirectThread ?? []) {
		const emails = sourceArray<string>(row.participant_emails);
		const ids = sourceArray<string>(row.participant_ids);
		const names = sourceArray<string>(row.participant_names);
		if (emails.length !== ids.length) continue;
		for (const [index, id] of ids.entries()) {
			const email = emails.at(index) ?? "";
			if (!email) continue;
			const previous = sourceParticipants.get(id);
			if (
				previous &&
				previous.email.trim().toLowerCase() !== email.trim().toLowerCase()
			)
				throw new Error(`Conflicting source participant identity: ${id}`);
			sourceParticipants.set(id, { id, email, name: names.at(index) || email });
		}
	}
	const actor = (
		name: string,
		email: string,
		sourceUserId?: string,
	): Id<"users"> => {
		const key =
			email.trim().toLowerCase() ||
			(sourceUserId ? `source-user:${sourceUserId}` : "");
		if (!key)
			throw new Error("Historical actor has no email or source identity.");
		requiredActors.set(key, {
			name: name || email || "Historical participant",
			email: email.trim().toLowerCase(),
			sourceUserId,
		});
		return author(name || email || "Historical participant", key);
	};
	const playerForEmail = (email: string): SourceRow | undefined =>
		players.find(
			(row) => row.email?.trim().toLowerCase() === email.trim().toLowerCase(),
		);
	const personForEmail = (email: string): string[] => {
		const player = playerForEmail(email);
		return player?.id ? [person(player.id)] : [];
	};
	const addConversation = (
		sourceId: string,
		value: Doc<"conversations">["value"],
	): void => {
		const previous = conversations.get(value.id);
		if (previous)
			conversations.set(value.id, {
				sourceId: previous.sourceId,
				value: {
					...previous.value,
					accountIds: [
						...new Set([...previous.value.accountIds, ...value.accountIds]),
					],
				},
			});
		else conversations.set(value.id, { sourceId, value });
	};
	for (const row of tables.DirectThread ?? []) {
		const emails = sourceArray<string>(row.participant_emails);
		const names = sourceArray<string>(row.participant_names);
		const ids = sourceArray<string>(row.participant_ids);
		if (!emails.length && !ids.length)
			throw new Error(`Direct thread has no source participants: ${row.id}`);
		const count = Math.max(emails.length, ids.length);
		const participants =
			ids.length && ids.length !== emails.length
				? ids.map(
						(id) =>
							sourceParticipants.get(id) ?? {
								id,
								name: "Historical participant",
								email: "",
							},
					)
				: Array.from({ length: count }, (_, index) => ({
						name:
							names.at(index) ?? emails.at(index) ?? "Historical participant",
						email: emails.at(index) ?? "",
						id: ids.at(index),
					}));
		if (ids.length !== emails.length)
			unlinked.push({
				sourceId: `base44:DirectThread:${row.id}`,
				feature: "participant source metadata",
				reason:
					"Source participant arrays differ in length; identities recovered by verified source user ID, never positional guesses.",
			});
		const accountIds = [
			...new Set(
				participants.map((entry) => actor(entry.name, entry.email, entry.id)),
			),
		];
		const namesForTitle = participants
			.filter(
				(entry) => actor(entry.name, entry.email, entry.id) !== currentOwnerId,
			)
			.map((entry) => entry.name);
		addConversation(`base44:DirectThread:${row.id}`, {
			id: `base44:thread:${row.id}`,
			kind: accountIds.length === 2 ? "direct" : "group",
			title: row.name || namesForTitle.join(", ") || "Historical conversation",
			subtitle:
				accountIds.length === 2 ? "Direct message" : "Group conversation",
			accountIds,
			participantPersonIds: [
				...new Set(
					participants.flatMap((entry) => personForEmail(entry.email)),
				),
			],
		});
	}
	const chatScopes = [
		...new Set(
			chats.map(
				(row) => `${row.channel || "group"}:${row.program_id || "club-wide"}`,
			),
		),
	];
	for (const scope of chatScopes) {
		const rows = chats.filter(
			(row) =>
				`${row.channel || "group"}:${row.program_id || "club-wide"}` === scope,
		);
		const first = rows.at(0);
		if (!first) continue;
		const programId = first.program_id || "club-wide";
		const coaches = first.channel === "coaches";
		const programMembers = new Set(
			memberships
				.filter(
					(row) => row.program_id === programId && row.is_active !== "false",
				)
				.map((row) => row.player_id),
		);
		const included = players.filter((row) =>
			coaches
				? (row.role === "coach" || row.role === "admin") &&
					(row.program_id === programId || programMembers.has(row.id ?? ""))
				: programId === "club-wide" ||
					row.program_id === programId ||
					programMembers.has(row.id ?? "") ||
					row.role === "coach" ||
					row.role === "admin",
		);
		const accountIds = [
			...new Set([
				...included.map((row) =>
					actor(
						row.full_name ?? "",
						row.email ?? "",
						row.user_id || row.linked_user_id,
					),
				),
				...rows.map((row) =>
					actor(
						row.sender_name ?? "",
						row.sender_email ?? "",
						row.created_by_id,
					),
				),
			]),
		];
		const id = coaches
			? `base44:coaches:${programId}`
			: programId === "club-wide"
				? "club"
				: programRoomId(program(programId));
		const programName =
			tables.Program?.find((row) => row.id === programId)?.name || "Club";
		addConversation(`base44:ChatChannel:${scope}`, {
			id,
			title: coaches
				? `${programName} coaches`
				: programId === "club-wide"
					? "General"
					: `${programName} program`,
			subtitle: coaches
				? "Private historical coach conversation"
				: "Program conversation",
			kind: coaches ? "group" : undefined,
			accountIds,
		});
	}
	const messageThreadId = (row: SourceRow): string =>
		row.thread_id
			? `base44:thread:${row.thread_id}`
			: row.channel === "coaches"
				? `base44:coaches:${row.program_id}`
				: !row.program_id || row.program_id === "club-wide"
					? "club"
					: programRoomId(program(row.program_id));
	const sourceMessageIds = new Map(
		[...chats, ...direct].map((row) => [
			row.id ?? "",
			{ id: `base44:message:${row.id}`, threadId: messageThreadId(row) },
		]),
	);
	for (const row of [...chats, ...direct].sort(
		(left, right) =>
			timestamp(left.created_date) - timestamp(right.created_date),
	)) {
		const sourceId = `base44:${row.thread_id ? "DirectMessage" : "ChatMessage"}:${row.id}`;
		const threadId = messageThreadId(row);
		const thread = conversations.get(threadId)?.value;
		if (!thread) {
			unlinked.push({
				sourceId,
				feature: "message",
				reason:
					"Source thread unavailable; do not publish into another conversation.",
			});
			continue;
		}
		const accountId = actor(
			row.sender_name ?? "",
			row.sender_email ?? "",
			row.created_by_id,
		);
		if (row.thread_id && !thread.accountIds.includes(accountId))
			unlinked.push({
				sourceId,
				feature: "historical sender identity",
				reason:
					"Sender email differs from current source participants. Preserved as its own inert actor without adding conversation access.",
			});
		const urls = [
			...sourceArray<string>(row.image_urls),
			...(row.file_url ? [row.file_url] : []),
		];
		const resolvedMedia = urls.map((url) => ({
			url,
			value: image?.(row.id ?? "", url),
		}));
		const media = resolvedMedia.flatMap((entry) =>
			entry.value ? [entry.value] : [],
		);
		const missingMedia = resolvedMedia
			.filter((entry) => !entry.value)
			.map((entry) => entry.url);
		if (missingMedia.length)
			unlinked.push({
				sourceId,
				feature: "message attachment",
				reason:
					"Original attachment URLs retained in text until copied into private message storage.",
			});
		const reactions = sourceArray<Reaction>(row.reactions).map((reaction) => ({
			emoji: reaction.emoji,
			accountIds: [
				...new Set([
					...(reaction.user_emails ?? []).map((email) =>
						actor(playerForEmail(email)?.full_name || email, email),
					),
					...(reaction.user_ids ?? []).map((id) =>
						actor("Historical participant", "", id),
					),
				]),
			],
		}));
		const replyTarget = row.reply_to_id
			? sourceMessageIds.get(row.reply_to_id)
			: undefined;
		const reply =
			replyTarget?.threadId === threadId ? replyTarget.id : undefined;
		if (row.reply_to_id && !reply)
			unlinked.push({
				sourceId,
				feature: "reply",
				reason:
					"Reply target absent from this conversation; original source stays archived without a cross-thread reference.",
			});
		if (row.poll_question || (row.poll_options && row.poll_options !== "[]"))
			unlinked.push({
				sourceId,
				feature: "poll",
				reason:
					"Poll source retained in archive; no invented vote or poll identity.",
			});
		if (row.pinned === "true")
			unlinked.push({
				sourceId,
				feature: "pin",
				reason:
					"Original pin retained in archive pending private pin-record migration.",
			});
		const createdAt = timestamp(row.created_date);
		const value: Doc<"messages">["value"] = {
			id: `base44:message:${row.id}`,
			threadId,
			accountId,
			author: row.sender_name || row.sender_email || "Historical participant",
			body: [row.message, ...missingMedia.map((url) => `Attachment: ${url}`)]
				.filter(Boolean)
				.join("\n\n"),
			time: new Date(createdAt).toISOString(),
			createdAt,
			edited: row.edited === "true" || undefined,
			announcement: row.is_announcement === "true" || undefined,
			images: media.length ? media : undefined,
			reactions: reactions.length ? reactions : undefined,
			replyToId: reply,
		};
		messages.push({ sourceId, value });
		if (
			row.is_announcement === "true" &&
			!row.thread_id &&
			row.channel !== "coaches"
		) {
			const date = sourceDate(createdAt);
			notices.push({
				sourceId: `base44:Announcement:${row.id}`,
				value: {
					id: `base44:announcement:${row.id}`,
					title: "Club announcement",
					body: value.body,
					program:
						!row.program_id || row.program_id === "club-wide"
							? "all"
							: program(row.program_id),
					date,
					postedAt: createdAt,
					expiresAt: date,
					acknowledgedBy: [],
				},
			});
		}
	}
	for (const row of tables.Lineup ?? []) {
		const sourceId = `base44:Lineup:${row.id}`;
		const black = sourceArray<SourceAssignment>(row.black_assignments);
		const white = sourceArray<SourceAssignment>(row.white_assignments);
		const linked = row.event_id
			? event(`base44:Event:${row.event_id}`)
			: row.session_id
				? event(`base44:Session:${row.session_id}`)
				: undefined;
		const referees = (["black", "white"] as const).flatMap((side) => {
			const ref = sourceArray<SourceAssignment>(
				row[`${side}_ref`] && row[`${side}_ref`] !== "null"
					? `[${row[`${side}_ref`]}]`
					: undefined,
			).at(0);
			return ref?.player_id ? [{ side, personId: person(ref.player_id) }] : [];
		});
		if (linked) {
			const blackIds = [
				...new Set(black.map((entry) => person(entry.player_id))),
			];
			const whiteIds = [
				...new Set(white.map((entry) => person(entry.player_id))),
			];
			if (blackIds.some((id) => whiteIds.includes(id)))
				throw new Error(
					`Lineup has one canonical player on both teams: ${row.id}`,
				);
			const sideRoster = (
				entries: SourceAssignment[],
				shape: string,
			): {
				field: string[];
				bench: string[];
				slots: { personId: string; slot: number }[];
				rotations: { personId: string; slot: number }[];
			} =>
				entries.reduce<{
					field: string[];
					bench: string[];
					slots: { personId: string; slot: number }[];
					rotations: { personId: string; slot: number }[];
				}>(
					(result, entry) => {
						const personId = person(entry.player_id);
						if ([...result.field, ...result.bench].includes(personId))
							return result;
						const targetSlot = slot(entry.position ?? "", shape);
						if (
							targetSlot === undefined ||
							result.slots.some((value) => value.slot === targetSlot)
						) {
							result.bench.push(personId);
							if (targetSlot !== undefined)
								result.rotations.push({ personId, slot: targetSlot });
						} else {
							result.field.push(personId);
							result.slots.push({ personId, slot: targetSlot });
						}
						return result;
					},
					{ field: [], bench: [], slots: [], rotations: [] },
				);
			const blackRoster = sideRoster(black, row.black_formation ?? "");
			const whiteRoster = sideRoster(white, row.white_formation ?? "");
			teams.push({
				sourceId,
				value: {
					id: linked.id,
					eventId: linked.id,
					revision: 1,
					published: row.published === "true",
					black: blackRoster.field,
					white: whiteRoster.field,
					attendees: [...blackIds, ...whiteIds],
					blackFormation: formation(row.black_formation),
					whiteFormation: formation(row.white_formation),
					blackBench: blackRoster.bench,
					whiteBench: whiteRoster.bench,
					referees,
					fieldSlots: [...blackRoster.slots, ...whiteRoster.slots],
					rotationSlots: [...blackRoster.rotations, ...whiteRoster.rotations],
				},
			});
			if (row.black_coach || row.white_coach)
				unlinked.push({
					sourceId,
					feature: "lineup coaches",
					reason:
						"Original side coach names are preserved in the source archive; TeamPlan has no per-side coach field.",
				});
		} else {
			const body = [
				"Historical lineup reference. No linked practice was captured; dates in the original label are not treated as event dates.",
				...(
					[
						["Black", black, row.black_formation],
						["White", white, row.white_formation],
					] as const
				).map(
					([side, entries, shape]) =>
						`${side}${shape ? ` · ${shape}` : ""}\n${entries.map((entry) => `${entry.position || "Position not recorded"}: ${entry.player_name || person(entry.player_id)}${entry.cap_number === undefined || entry.cap_number === null ? "" : ` · cap ${entry.cap_number}`}`).join("\n")}`,
				),
				...(
					["black_coach", "white_coach", "black_ref", "white_ref"] as const
				).flatMap((key) => {
					const role = sourceArray<SourceAssignment>(
						row[key] && row[key] !== "null" ? `[${row[key]}]` : undefined,
					).at(0);
					return role
						? [
								`${key.replaceAll("_", " ")}: ${role.player_name || person(role.player_id)}`,
							]
						: [];
				}),
			].join("\n\n");
			resources.push({
				sourceId,
				value: {
					key: sourceId,
					title: row.label || "Historical lineup",
					description: body,
					kind: "document",
					audience: "coaches",
					personIds: [],
					programIds: row.program_id ? [program(row.program_id)] : [],
					category: "formations",
					authorId: actor(
						row.created_by || "Historical coach",
						row.created_by ?? "",
						row.created_by_id,
					),
					archived: false,
					revision: 1,
					updatedAt: timestamp(row.updated_date || row.created_date),
				},
			});
			unlinked.push({
				sourceId,
				feature: "lineup",
				reason:
					"No linked source event or session; retained as coach-only reference, never a fabricated practice.",
			});
		}
	}
	return {
		conversations: [...conversations.values()],
		messages,
		notices,
		teams,
		resources,
		requiredActors: [...requiredActors.values()],
		unlinked,
		summary: {
			conversations: conversations.size,
			messages: messages.length,
			ownerDirectThreads: [...conversations.values()].filter(
				(entry) =>
					entry.sourceId.startsWith("base44:DirectThread:") &&
					entry.value.accountIds.includes(currentOwnerId),
			).length,
			privateOtherDirectThreads: [...conversations.values()].filter(
				(entry) =>
					entry.sourceId.startsWith("base44:DirectThread:") &&
					!entry.value.accountIds.includes(currentOwnerId),
			).length,
			reactions: messages.reduce(
				(count, entry) => count + (entry.value.reactions?.length ?? 0),
				0,
			),
			announcements: notices.length,
			teams: teams.length,
			lineupReferences: resources.length,
			unlinked: unlinked.length,
		},
	};
};
