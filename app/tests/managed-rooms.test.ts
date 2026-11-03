import { expect, test } from "bun:test";
import { createStore } from "jotai";
import {
	initialAppData,
	previewAccounts,
	primaryAccount,
} from "../src/demo/app-data";
import {
	previewAccountIdAtom,
	previewActionAtom,
	previewDataAtom,
} from "../src/demo/app-state";
import { previewHouseholdAccounts } from "../src/demo/household-data";
import { previewInboxItems } from "../src/demo/inbox-state";
import type { Account, AppData } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { canRegister } from "../src/domain/event-eligibility";
import {
	activeRoomPrograms,
	managedConversation,
	programRoomId,
	roomAccountAllowed,
	roomRegistryRevision,
	staffRoomId,
	withManagedRooms,
} from "../src/domain/managed-rooms";
import { conversationKind } from "../src/domain/messaging";
import { defaultProgramRsvp } from "../src/domain/programs";
import {
	addPreviewParticipants,
	previewThreadParticipants,
} from "../src/domain/thread-participants";

const account = (id: string): Account => {
	const found = previewAccounts.find((entry) => entry.id === id);
	if (!found) throw new Error("Missing test account.");
	return found;
};
const room = (
	data: AppData,
	id: string,
): NonNullable<AppData["conversations"][number]> => {
	const found = data.conversations.find((entry) => entry.id === id);
	if (!found) throw new Error("Missing room.");
	return found;
};

test("canonical club and program channels stay distinct without creating a Staff room", (): void => {
	const data = withManagedRooms(initialAppData, previewAccounts);
	expect(
		data.conversations.filter((thread) => thread.id === "club"),
	).toHaveLength(1);
	expect(
		data.conversations.filter((thread) => thread.id === "youth"),
	).toHaveLength(1);
	expect(
		data.conversations.some((thread) => thread.id === "room:program:youth"),
	).toBe(false);
	expect(room(data, "club").title).toBe("General");
	expect(data.conversations.some((thread) => thread.id === staffRoomId)).toBe(
		false,
	);
	expect(room(data, programRoomId("club")).title).toBe("Thursday program");
	expect(conversationKind(room(data, "youth"))).toBe("program");
	expect(data.messages).toBe(initialAppData.messages);
	expect(withManagedRooms(data, previewAccounts)).toEqual(data);
	expect(
		managedConversation(
			{
				id: "room:program:youth",
				title: "Spoofed duplicate",
				subtitle: "",
				accountIds: ["taylor"],
			},
			previewAccounts,
			data,
		).accountIds,
	).toEqual([]);
});

test("retired Staff history stays stored but no current role can list or access it", (): void => {
	const raw: AppData = {
		...initialAppData,
		conversations: [
			...initialAppData.conversations,
			{
				id: staffRoomId,
				title: "Staff",
				subtitle: "Private",
				accountIds: ["alex", "casey", "morgan"],
			},
		],
		messages: [
			...initialAppData.messages,
			{
				id: "retired-staff",
				threadId: staffRoomId,
				accountId: "casey",
				author: "Casey",
				time: "Now",
				body: "Historical private staff message",
			},
		],
	};
	const data = withManagedRooms(raw, previewAccounts);
	expect(room(data, staffRoomId).accountIds).toEqual([]);
	expect(data.messages).toBe(raw.messages);
	for (const actor of previewAccounts) {
		expect(roomAccountAllowed({ kind: "staff" }, actor, data)).toBe(false);
		const visible = visibleAppData(data, actor);
		expect(
			previewInboxItems(raw, actor, {}).some(
				(item) =>
					item.target.kind === "message" &&
					item.target.threadId === staffRoomId,
			),
		).toBe(false);
		expect(
			visible.conversations.some((thread) => thread.id === staffRoomId),
		).toBe(false);
		expect(
			visible.messages.some((message) => message.threadId === staffRoomId),
		).toBe(false);
	}
	const store = createStore();
	store.set(previewDataAtom, raw);
	expect(() =>
		store.set(previewActionAtom, {
			type: "send-message",
			id: "stale-staff-write",
			threadId: staffRoomId,
			body: "Must not send",
			time: "Now",
		}),
	).toThrow();
});

test("program membership dynamically follows active household players and revokes without erasing chats", (): void => {
	const data = withManagedRooms(initialAppData, previewAccounts);
	expect(room(data, "youth").accountIds).toContain("jamie");
	expect(room(data, "youth").accountIds).toContain("taylor");
	const unlinked = withManagedRooms(
		data,
		previewAccounts.map((entry) =>
			entry.id === "jamie" ? { ...entry, children: [] } : entry,
		),
	);
	expect(room(unlinked, "youth").accountIds).not.toContain("jamie");
	const archived = withManagedRooms(
		{
			...data,
			members: data.members.map((entry) =>
				["sam", "mila"].includes(entry.id)
					? { ...entry, archived: true }
					: entry,
			),
		},
		previewAccounts,
	);
	expect(room(archived, "youth").accountIds).not.toContain("jamie");
	expect(room(archived, "club").accountIds).toContain("jamie");
	expect(archived.messages).toBe(data.messages);
	const merged = withManagedRooms(
		{
			...data,
			members: data.members.map((entry) =>
				["sam", "mila"].includes(entry.id)
					? { ...entry, archived: true, mergedInto: "taylor" }
					: entry,
			),
		},
		previewAccounts,
	);
	expect(room(merged, "youth").accountIds).not.toContain("jamie");
	expect(room(merged, programRoomId("club")).accountIds).not.toContain("jamie");
	expect(room(merged, "club").accountIds).toContain("jamie");
});

test("inactive, archived, unknown and out-of-season programs fail closed", (): void => {
	const source = initialAppData.programs ?? [];
	const data = {
		...initialAppData,
		programs: source.map((program) => ({ ...program, archived: true })),
	};
	expect(activeRoomPrograms(data)).toEqual([]);
	expect(
		roomAccountAllowed(
			{ kind: "program", programId: "unknown" },
			primaryAccount,
			initialAppData,
		),
	).toBe(false);
	expect(
		roomAccountAllowed(
			{ kind: "program", programId: "youth" },
			primaryAccount,
			data,
		),
	).toBe(false);
	const expired = {
		...initialAppData,
		programs: source.map((program) => ({ ...program, seasonId: "past" })),
		seasons: [
			{ id: "past", name: "Past", start: "2020-01-01", end: "2020-12-31" },
		],
	};
	expect(activeRoomPrograms(expired)).toEqual([]);
});

test("managed-room participant lists are current and cannot be edited or forged", (): void => {
	const data = withManagedRooms(initialAppData, previewAccounts);
	const youth = room(data, "youth");
	const state = previewThreadParticipants(
		data,
		previewAccounts,
		account("jamie"),
		youth,
	);
	expect(state.kind).toBe("program");
	expect(state.canAdd).toBe(false);
	expect(state.candidates).toEqual([]);
	expect(state.members.some((entry) => entry.id === "person:sam")).toBe(true);
	expect(
		previewThreadParticipants(
			data,
			previewAccounts,
			{ ...account("taylor"), id: "unrelated-account", children: [] },
			youth,
		).members,
	).toEqual([]);
	expect(() =>
		addPreviewParticipants(
			data,
			previewAccounts,
			primaryAccount,
			"youth",
			["taylor"],
			"new-group",
		),
	).toThrow();
	const direct = {
		id: "dm-alex-taylor",
		title: "Private",
		subtitle: "Direct message",
		kind: "direct",
		accountIds: ["alex", "taylor"],
	} satisfies AppData["conversations"][number];
	expect(() =>
		addPreviewParticipants(
			{ ...data, conversations: [...data.conversations, direct] },
			previewAccounts,
			primaryAccount,
			direct.id,
			["jamie"],
			staffRoomId,
		),
	).toThrow();
});

test("preview writes and visibility revoke program rooms immediately after household changes", (): void => {
	const store = createStore();
	store.set(previewDataAtom, withManagedRooms(initialAppData, previewAccounts));
	store.set(previewAccountIdAtom, "jamie");
	const send = {
		type: "send-message",
		id: "before-unlink",
		threadId: "youth",
		body: "Ready",
		time: "Now",
	} as const;
	store.set(previewActionAtom, send);
	store.set(previewHouseholdAccounts, { jamie: { children: [] } });
	expect(() =>
		store.set(previewActionAtom, { ...send, id: "after-unlink" }),
	).toThrow();
	const resolved = withManagedRooms(
		store.get(previewDataAtom),
		previewAccounts.map((entry) =>
			entry.id === "jamie" ? { ...entry, children: [] } : entry,
		),
	);
	expect(
		visibleAppData(resolved, {
			...account("jamie"),
			children: [],
		}).conversations.some((thread) => thread.id === "youth"),
	).toBe(false);
	const event = initialAppData.events.at(0);
	const member = initialAppData.members.at(0);
	if (!event || !member) throw new Error("Missing fixtures.");
	expect(
		canRegister({ ...member, archived: false, mergedInto: "other" }, event),
	).toBe(false);
});

test("room sync ignores RSVP-only edits and ordering but observes names and active membership windows", (): void => {
	const data = {
		programs: [
			{
				id: "monday",
				name: "Monday",
				archived: false,
				revision: 1,
				rsvp: defaultProgramRsvp(),
				status: "active" as const,
				kind: "hockey" as const,
			},
			{
				id: "youth",
				name: "Youth",
				archived: false,
				revision: 1,
				rsvp: defaultProgramRsvp(),
				status: "active" as const,
				kind: "hockey" as const,
			},
		],
		seasons: initialAppData.seasons,
	};
	const current = roomRegistryRevision(data, "2026-11-02");
	expect(
		roomRegistryRevision(
			{ ...data, programs: [...data.programs].reverse() },
			"2026-11-02",
		),
	).toBe(current);
	expect(
		roomRegistryRevision(
			{
				...data,
				programs: data.programs.map((program) => ({
					...program,
					description: "Changed pool notes",
					revision: 2,
					rsvp: { ...program.rsvp, openDays: 3 },
				})),
			},
			"2026-11-02",
		),
	).toBe(current);
	expect(
		roomRegistryRevision(
			{
				...data,
				programs: data.programs.map((program) => ({
					...program,
					name: `${program.name} new`,
				})),
			},
			"2026-11-02",
		),
	).not.toBe(current);
	expect(
		roomRegistryRevision(
			{
				...data,
				programs: data.programs.map((program) => ({
					...program,
					archived: true,
				})),
			},
			"2026-11-02",
		),
	).not.toBe(current);
	const seasonal = {
		...data,
		programs: data.programs.map((program) => ({
			...program,
			seasonId: "short",
		})),
		seasons: [
			{ id: "short", name: "Short", start: "2026-11-02", end: "2026-11-30" },
		],
	};
	expect(roomRegistryRevision(seasonal, "2026-11-01")).toBe("[]");
	expect(roomRegistryRevision(seasonal, "2026-11-02")).toBe(current);
	expect(roomRegistryRevision(seasonal, "2026-12-01")).toBe("[]");
});
