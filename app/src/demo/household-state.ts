import { atom } from "jotai";
import type { Account } from "../domain/app-types";
import {
	type HouseholdState,
	householdLimits,
	householdNameError,
	householdProjection,
} from "../domain/household";
import { memberMergeFingerprint } from "../domain/member-merge";
import { canonicalMemberAccount } from "../domain/member-merge-identity";
import { previewAccounts } from "./app-data";
import {
	previewAccountAtom,
	previewDataAtom,
	selectedPersonAtom,
} from "./app-state";
import {
	previewHouseholdAccounts,
	previewHouseholdLinks,
} from "./household-data";

export type HouseholdCommand =
	| { type: "create"; name: string; key: string }
	| { type: "invite"; accountId: string; personId: string; key: string }
	| { type: "accept"; id: string }
	| { type: "dismiss"; id: string }
	| { type: "unlink"; personId: string }
	| { type: "default"; personId: string };
export const previewHouseholdState = atom((get): HouseholdState => {
	const account = get(previewAccountAtom);
	const people = get(previewDataAtom).members;
	return householdProjection(
		account,
		people,
		get(previewHouseholdLinks)
			.filter(
				(link) =>
					link.userId === account.id &&
					link.state === "available" &&
					![account.personId, ...account.children].includes(link.personId) &&
					people.some(
						(row) =>
							row.id === link.personId && !row.archived && !row.mergedInto,
					),
			)
			.map((link) => ({
				id: link.id,
				personId: link.personId,
				origin: link.origin,
				name: people.find((row) => row.id === link.personId)?.name ?? "Member",
			}))
			.filter(
				(row, index, all) =>
					all.findIndex((entry) => entry.personId === row.personId) === index,
			),
	);
});
export const previewHouseholdCommand = atom(
	undefined,
	(get, set, command: HouseholdCommand): void => {
		const actor = get(previewAccountAtom);
		const data = get(previewDataAtom);
		const links = get(previewHouseholdLinks);
		const overrides = get(previewHouseholdAccounts);
		const saveAccount = (
			account: Account,
			children: string[],
			defaultPersonId = account.defaultPersonId,
		): void =>
			set(previewHouseholdAccounts, {
				...overrides,
				[account.id]: { children, defaultPersonId },
			});
		if (command.type === "create") {
			const error = householdNameError(command.name);
			if (error) throw new Error(error);
			if (command.key.length < 16 || command.key.length > 100)
				throw new Error("Reopen household settings and try again.");
			const previous = links.find(
				(row) => row.userId === actor.id && row.key === command.key,
			);
			if (previous) {
				if (
					previous.origin !== "created" ||
					previous.payload !== command.name.trim()
				)
					throw new Error(
						"This request key was already used for another profile.",
					);
				return;
			}
			if (
				actor.children.length >= householdLimits.linked ||
				links.filter(
					(row) => row.userId === actor.id && row.origin === "created",
				).length >= householdLimits.created
			)
				throw new Error(
					"Contact an administrator to review additional household profiles.",
				);
			const personId = `dependent:${memberMergeFingerprint([actor.id, command.key])}`;
			set(previewDataAtom, {
				...data,
				members: [
					...data.members,
					{
						id: personId,
						name: command.name.trim(),
						programs: [],
						position: "",
						rating: 0,
						registration: "missing",
						goal: "",
						steps: 0,
					},
				],
			});
			set(previewHouseholdLinks, [
				...links,
				{
					id: personId,
					personId,
					userId: actor.id,
					createdBy: actor.id,
					origin: "created",
					state: "accepted",
					key: command.key,
					payload: command.name.trim(),
				},
			]);
			saveAccount(actor, [...actor.children, personId]);
			return;
		}
		if (command.type === "invite") {
			if (!actor.admin) throw new Error("Administrator access required.");
			if (command.key.length < 16 || command.key.length > 100)
				throw new Error("Reopen the guardian invitation and try again.");
			const base = previewAccounts.find((row) => row.id === command.accountId);
			const target = base
				? canonicalMemberAccount(
						{ ...base, ...overrides[base.id] },
						data.members,
					)
				: undefined;
			const person = data.members.find((row) => row.id === command.personId);
			if (
				!target ||
				!person ||
				person.archived ||
				person.mergedInto ||
				target.personId === person.id
			)
				throw new Error(
					"Choose an active member and a club account without this link.",
				);
			const payload = `${actor.id}:${person.id}`;
			const previous = links.find(
				(row) => row.userId === target.id && row.key === command.key,
			);
			if (previous) {
				if (previous.payload !== payload)
					throw new Error("This request key was already used.");
				return;
			}
			if (target.children.includes(person.id))
				throw new Error("That account already has this household link.");
			if (
				!links.some(
					(row) =>
						row.userId === target.id &&
						row.personId === person.id &&
						row.state === "available",
				)
			)
				set(previewHouseholdLinks, [
					...links,
					{
						id: command.key,
						key: command.key,
						payload,
						userId: target.id,
						personId: person.id,
						createdBy: actor.id,
						origin: "administrator",
						state: "available",
					},
				]);
			return;
		}
		if (command.type === "accept" || command.type === "dismiss") {
			const link = links.find((row) => row.id === command.id);
			if (
				!link ||
				link.userId !== actor.id ||
				!["available", "accepted"].includes(link.state)
			)
				throw new Error("Household invitation unavailable.");
			if (command.type === "dismiss") {
				if (link.state !== "available")
					throw new Error("Household invitation unavailable.");
				set(
					previewHouseholdLinks,
					links.map((row) =>
						row.id === link.id ? { ...row, state: "dismissed" } : row,
					),
				);
				return;
			}
			const person = data.members.find((row) => row.id === link.personId);
			if (
				!person ||
				person.archived ||
				person.mergedInto ||
				actor.personId === person.id
			)
				throw new Error("Choose an active household profile.");
			if (actor.children.includes(person.id)) return;
			if (actor.children.length >= householdLimits.linked)
				throw new Error(
					"Contact an administrator to review additional household profiles.",
				);
			saveAccount(actor, [...actor.children, person.id]);
			set(
				previewHouseholdLinks,
				links.map((row) =>
					row.id === link.id ? { ...row, state: "accepted" } : row,
				),
			);
			return;
		}
		const person = data.members.find((row) => row.id === command.personId);
		if (!person || person.mergedInto) throw new Error("Member unavailable.");
		if (command.type === "default") {
			if (
				person.archived ||
				![actor.personId, ...actor.children].includes(person.id)
			)
				throw new Error("Choose an active linked household profile.");
			saveAccount(actor, actor.children, person.id);
			set(selectedPersonAtom, person.id);
			return;
		}
		if (actor.personId === person.id || !actor.children.includes(person.id))
			throw new Error(
				"You can only unlink a current dependent, not your own login identity.",
			);
		const known = links.some(
			(row) => row.userId === actor.id && row.personId === person.id,
		);
		set(
			previewHouseholdLinks,
			known
				? links.map((row) =>
						row.userId === actor.id && row.personId === person.id
							? { ...row, state: "available" }
							: row,
					)
				: links.filter((row) => row.userId === actor.id).length >= 100
					? links
					: [
							...links,
							{
								id: `unlink:${actor.id}:${person.id}`,
								userId: actor.id,
								personId: person.id,
								createdBy: actor.id,
								origin: "previous",
								state: "available",
								key: `unlink:${person.id}`,
								payload: person.id,
							},
						],
		);
		const fallback =
			actor.defaultPersonId === person.id
				? actor.personId
				: actor.defaultPersonId;
		saveAccount(
			actor,
			actor.children.filter((id) => id !== person.id),
			fallback,
		);
		if (get(selectedPersonAtom) === person.id)
			set(selectedPersonAtom, actor.personId);
	},
);
