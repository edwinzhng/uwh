import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { EquipmentInspection } from "../convex/local_equipment_checks";
import { addDays } from "../src/domain/app-rules";
import type { EventDraft } from "../src/domain/app-types";
import type { EquipmentLoanRequest } from "../src/domain/equipment-loans";
import { clubDate } from "../src/domain/event-time";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("guest-loans");
const local = async (args: object): Promise<EquipmentInspection> => {
	const child = Bun.spawn(
		[
			process.execPath,
			"scripts/local-convex.ts",
			"run",
			"local_equipment_checks:inspect",
			JSON.stringify(args),
			"--typecheck",
			"disable",
		],
		{ env: process.env, stdout: "pipe", stderr: "pipe" },
	);
	const [output, error, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (code) throw new Error(`Isolated equipment inspection failed: ${error}`);
	const result: EquipmentInspection = JSON.parse(output);
	return result;
};
try {
	const outside = await run.fixture("Equipment observer in another club");
	await outside.client.mutation(api.club.create, {
		name: "Other equipment verification",
		samples: false,
	});
	const outsideWorkspace = await outside.client.query(api.club.current, {});
	assert(outsideWorkspace);
	const owner = await run.fixture("Guest equipment administrator");
	await owner.client.mutation(api.club.create, {
		name: "Guest loan verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const player = await run.fixture("Guest equipment club player");
	const peer = await run.fixture("Guest equipment second administrator");
	for (const actor of [player, peer])
		await actor.client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
	const [playerWorkspace, peerWorkspace] = await Promise.all([
		player.client.query(api.club.current, {}),
		peer.client.query(api.club.current, {}),
	]);
	assert(playerWorkspace && peerWorkspace);
	await owner.client.mutation(api.club.setAccess, {
		accountId: peerWorkspace.account.id,
		children: [],
		coachPrograms: [],
		admin: true,
	});
	const fixture = {
		clubId: workspace.clubId,
		observerId: outsideWorkspace.account.id,
	};
	const inspect = (): Promise<EquipmentInspection> => local(fixture);
	const item = {
		id: "shared-guest-stock",
		name: "Verification fins",
		size: "Medium",
		condition: "ready",
		quantity: 2,
	} as const;
	await owner.client.mutation(api.club.apply, {
		action: { type: "add-equipment", equipment: item },
	});
	const draft: EventDraft = {
		title: "Fictional guest practice",
		date: addDays(clubDate(), 1),
		start: "19:00",
		end: "20:00",
		venue: "Fictional pool",
		program: "club",
		kind: "training",
		repeat: "once",
		occurrences: 1,
		seasonId: "2026-2027",
		description: "Synthetic equipment verification",
	};
	const eventKey = `guest-practice-${crypto.randomUUID()}`;
	await owner.client.mutation(api.club.apply, {
		action: { type: "create-event", id: eventKey, draft },
	});
	const eventId = `${eventKey}-0`;
	const before = await inspect();
	const request: EquipmentLoanRequest = {
		requestId: crypto.randomUUID(),
		id: crypto.randomUUID(),
		itemId: item.id,
		due: addDays(draft.date, 10),
		borrower: {
			kind: "guest",
			guestId: playerWorkspace.account.personId,
			eventId,
			name: "Fictional Outside Guest",
		},
	};
	const ids = await Promise.all([
		owner.client.mutation(api.equipment_loans.create, { request }),
		owner.client.mutation(api.equipment_loans.create, { request }),
	]);
	assert.deepEqual(ids, [request.id, request.id]);
	const created = await inspect();
	assert.deepEqual(created.members, before.members);
	assert.equal(created.guests.length, 1);
	assert.equal(created.loans.length, 1);
	assert.equal(created.commands.length, 1);
	assert.equal(created.loans.at(0)?.personId, undefined);
	assert.equal(created.loans.at(0)?.borrower?.eventId, eventId);
	assert.equal(created.loans.at(0)?.borrower?.practiceTitle, draft.title);
	await assert.rejects(
		owner.client.mutation(api.equipment_loans.create, {
			request: { ...request, due: addDays(request.due, 1) },
		}),
	);
	await assert.rejects(
		peer.client.mutation(api.equipment_loans.create, { request }),
	);
	await assert.rejects(
		player.client.mutation(api.equipment_loans.create, {
			request: {
				...request,
				requestId: crypto.randomUUID(),
				id: crypto.randomUUID(),
			},
		}),
	);
	await assert.rejects(
		outside.client.mutation(api.equipment_loans.create, {
			request: {
				...request,
				requestId: crypto.randomUUID(),
				id: crypto.randomUUID(),
			},
		}),
	);
	const anonymous = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	for (const client of [anonymous, player.client, outside.client]) {
		assert.deepEqual(
			await client.query(api.equipment_loans.guests, { eventId }),
			[],
		);
		assert.equal(
			(
				await client.query(api.equipment_loans.catalog, {
					paginationOpts: { cursor: null, numItems: 2000 },
				})
			).page.length,
			0,
		);
	}
	const playerHome = await player.client.query(api.club.current, {
		screen: "account",
	});
	assert(playerHome);
	assert.equal(playerHome.data.loans.length, 0);
	const guest = request.borrower;
	assert.equal(guest.kind, "guest");
	if (guest.kind !== "guest") throw new Error("Guest fixture required");
	await assert.rejects(
		owner.client.mutation(api.equipment_loans.create, {
			request: {
				...request,
				requestId: crypto.randomUUID(),
				id: crypto.randomUUID(),
				borrower: { ...guest, name: "Different guest" },
			},
		}),
	);
	const unrelatedKey = `other-practice-${crypto.randomUUID()}`;
	await owner.client.mutation(api.club.apply, {
		action: { type: "create-event", id: unrelatedKey, draft },
	});
	await assert.rejects(
		owner.client.mutation(api.equipment_loans.create, {
			request: {
				...request,
				requestId: crypto.randomUUID(),
				id: crypto.randomUUID(),
				borrower: { ...guest, eventId: `${unrelatedKey}-0` },
			},
		}),
	);
	const races = await Promise.allSettled(
		["First", "Second"].map((name) =>
			owner.client.mutation(api.equipment_loans.create, {
				request: {
					...request,
					requestId: crypto.randomUUID(),
					id: crypto.randomUUID(),
					borrower: {
						...guest,
						guestId: crypto.randomUUID(),
						name: `${name} race guest`,
					},
				},
			}),
		),
	);
	assert.equal(
		races.filter((result) => result.status === "fulfilled").length,
		1,
	);
	assert.equal(
		races.filter((result) => result.status === "rejected").length,
		1,
	);
	const full = await inspect();
	assert.equal(full.guests.length, 2);
	assert.equal(full.loans.filter((loan) => !loan.returned).length, 2);
	await owner.client.mutation(api.club.apply, {
		action: { type: "return", loanId: request.id },
	});
	const memberRequest: EquipmentLoanRequest = {
		...request,
		requestId: crypto.randomUUID(),
		id: crypto.randomUUID(),
		borrower: { kind: "member", personId: playerWorkspace.account.personId },
	};
	await owner.client.mutation(api.equipment_loans.create, {
		request: memberRequest,
	});
	await assert.rejects(
		player.client.mutation(api.club.apply, {
			action: { type: "return", loanId: memberRequest.id },
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: { type: "update-equipment", equipment: { ...item, quantity: 1 } },
		}),
	);
	const returned = await owner.client.query(api.pages.returns, {
		search: "Fictional Outside Guest",
		paginationOpts: { cursor: null, numItems: 2000 },
	});
	assert.equal(returned.page.length, 1);
	assert.equal(returned.page.at(0)?.id, request.id);
	assert(returned.page.at(0)?.person.includes("(guest)"));
	assert(returned.page.at(0)?.person.includes(draft.title));
	assert.equal(
		(
			await player.client.query(api.pages.returns, {
				paginationOpts: { cursor: null, numItems: 30 },
			})
		).page.length,
		0,
	);
	await owner.client.mutation(api.club.setAccess, {
		accountId: peerWorkspace.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	await assert.rejects(
		peer.client.mutation(api.equipment_loans.create, { request }),
	);
	assert.deepEqual(
		await peer.client.query(api.equipment_loans.guests, { eventId }),
		[],
	);
	await owner.client.mutation(api.club.setAccess, {
		accountId: peerWorkspace.account.id,
		children: [],
		coachPrograms: [],
		admin: true,
	});
	await run.dispose(player);
	const erasedMember = await inspect();
	assert(
		!erasedMember.loans.some(
			(loan) => loan.personId === playerWorkspace.account.personId,
		),
	);
	assert(
		erasedMember.guests.some(
			(entry) => entry.id === playerWorkspace.account.personId,
		),
	);
	assert(
		erasedMember.loans.some(
			(loan) => loan.borrower?.guestId === playerWorkspace.account.personId,
		),
	);
	assert(
		!erasedMember.commands.some(
			(entry) => entry.personId === playerWorkspace.account.personId,
		),
	);
	const peerIdentity = await peer.client.query(api.account.current, {});
	assert(peerIdentity);
	await run.dispose(owner, peerIdentity.id);
	const authorErased = await inspect();
	assert(authorErased.guests.every((entry) => entry.createdBy === undefined));
	assert(
		!authorErased.commands.some(
			(entry) => entry.actorId === workspace.account.id,
		),
	);
	assert.equal(
		(await peer.client.query(api.equipment_loans.guests, { eventId })).length,
		2,
	);
	await run.dispose(peer);
	const erasedClub = await inspect();
	assert.equal(erasedClub.clubExists, false);
	assert.deepEqual(erasedClub.guests, []);
	assert.deepEqual(erasedClub.commands, []);
	assert.deepEqual(erasedClub.loans, []);
	console.log(
		"Guest loans verified: practice-scoped nonmember identity, atomic retry and stock races, permissions, cross-club privacy, returns, and account/club erasure.",
	);
} finally {
	await run.close();
}
