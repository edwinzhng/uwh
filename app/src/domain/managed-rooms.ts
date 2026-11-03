import type { Account, AppData, Conversation } from "./app-types";
import { staffRoomId } from "./conversation-policy";
import { clubDate } from "./event-time";
import { generalConversation } from "./general-chat";
import { canonicalMemberAccount } from "./member-merge-identity";
import { clubPrograms } from "./programs";

export type ManagedRoom =
	| { kind: "general" }
	| { kind: "staff" }
	| { kind: "program"; programId: string };
export type RoomData = Pick<
	AppData,
	"members" | "programs" | "seasons" | "timeZone"
>;
export { staffRoomId } from "./conversation-policy";
export const programRoomId = (id: string): string =>
	id === "youth" ? "youth" : `room:program:${id}`;
export const managedRoom = (id: string): ManagedRoom | undefined =>
	id === "club"
		? { kind: "general" }
		: id === staffRoomId
			? { kind: "staff" }
			: id === "youth"
				? { kind: "program", programId: "youth" }
				: id.startsWith("room:program:")
					? { kind: "program", programId: id.slice("room:program:".length) }
					: undefined;
export const reservedRoomId = (id: string): boolean =>
	id === "club" || id === "youth" || id.startsWith("room:");
const activeProgramsOnDate = (
	data: Pick<RoomData, "programs" | "seasons">,
	today: string,
): ReturnType<typeof clubPrograms> =>
	clubPrograms(data).filter(
		(program) =>
			!program.archived &&
			program.status === "active" &&
			(!program.seasonId ||
				data.seasons.some(
					(season) =>
						season.id === program.seasonId &&
						season.start <= today &&
						today <= season.end,
				)),
	);

export const activeRoomPrograms = (
	data: RoomData,
	now = Date.now(),
): ReturnType<typeof clubPrograms> =>
	activeProgramsOnDate(data, clubDate(now, data.timeZone));

export const roomRegistryRevision = (
	data: Pick<RoomData, "programs" | "seasons">,
	today: string,
): string =>
	JSON.stringify(
		activeProgramsOnDate(data, today)
			.map(({ id, name }) => ({ id, name }))
			.sort((a, b) => a.id.localeCompare(b.id)),
	);

export const roomAccountAllowed = (
	room: ManagedRoom,
	account: Account,
	data: RoomData,
): boolean => {
	if (room.kind === "general") return true;
	const staff = account.admin || account.coachPrograms.length > 0;
	if (room.kind === "staff") return false;
	if (
		!activeRoomPrograms(data).some((program) => program.id === room.programId)
	)
		return false;
	return (
		staff ||
		data.members.some(
			(person) =>
				!person.archived &&
				!person.mergedInto &&
				[account.personId, ...account.children].includes(person.id) &&
				person.programs.includes(room.programId),
		)
	);
};
export const programRoomPersonIds = (
	threadId: string,
	data: Pick<AppData, "members">,
): string[] => {
	const room = managedRoom(threadId);
	return room?.kind === "program"
		? data.members
				.filter(
					(person) =>
						!person.archived &&
						!person.mergedInto &&
						person.programs.includes(room.programId),
				)
				.map((person) => person.id)
		: [];
};
export const managedConversation = (
	thread: Conversation,
	accounts: Account[],
	data: RoomData,
): Conversation => {
	const room = managedRoom(thread.id);
	if (!room) return thread;
	const canonical =
		room.kind !== "program" || thread.id === programRoomId(room.programId);
	const accountIds = canonical
		? accounts
				.filter((account) => roomAccountAllowed(room, account, data))
				.map((account) => account.id)
		: [];
	if (room.kind === "general") return generalConversation(accountIds, thread);
	const program =
		room.kind === "program"
			? clubPrograms(data).find((entry) => entry.id === room.programId)
			: undefined;
	return {
		...thread,
		kind: undefined,
		eventId: undefined,
		participantPersonIds: undefined,
		title:
			room.kind === "staff"
				? "Staff"
				: `${program?.name ?? "Unavailable program"} program`,
		subtitle:
			room.kind === "staff"
				? "Private · administrators and coaches"
				: "Program players, linked guardians and staff",
		accountIds,
	};
};
export const withManagedRooms = (
	data: AppData,
	accounts: Account[],
): AppData => {
	const resolved = accounts.map((account) =>
		canonicalMemberAccount(account, data.members),
	);
	const ids = [
		"club",
		...activeRoomPrograms(data).map((program) => programRoomId(program.id)),
	];
	const conversations = data.conversations.map((thread) =>
		managedConversation(thread, resolved, data),
	);
	const missing = ids
		.filter((id) => !conversations.some((thread) => thread.id === id))
		.map((id) =>
			managedConversation(
				{ id, title: "", subtitle: "", accountIds: [] },
				resolved,
				data,
			),
		);
	return { ...data, conversations: [...missing, ...conversations] };
};
