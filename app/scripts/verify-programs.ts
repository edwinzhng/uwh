import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { addDays } from "../src/domain/app-rules";
import type { AppAction } from "../src/domain/app-types";
import { clubDate } from "../src/domain/event-time";
import {
	defaultProgramRsvp,
	type ProgramDraft,
	programDraft,
} from "../src/domain/programs";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("programs");
try {
	const owner = await run.fixture("Program administrator");
	await owner.client.mutation(api.club.create, {
		name: "Program verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const player = await run.fixture("Program player");
	await player.client.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	const playerWorkspace = await player.client.query(api.club.current, {});
	assert(playerWorkspace);
	const tomorrow = addDays(clubDate(undefined, workspace.data.timeZone), 1);
	const draft: ProgramDraft = {
		id: `program-${crypto.randomUUID()}`,
		name: "Weekend roster",
		archived: false,
		status: "active",
		kind: "hockey",
		seasonId: "2026-2027",
		schedule: {
			startDate: tomorrow,
			endDate: addDays(tomorrow, 14),
			weekday: new Date(`${tomorrow}T12:00:00Z`).getUTCDay() || 7,
			start: "19:00",
			end: "20:30",
			venue: "Fictional pool",
		},
		rsvp: { ...defaultProgramRsvp(), openDays: 7, defaultResponse: "going" },
	};
	const action = {
		type: "save-program",
		requestId: crypto.randomUUID(),
		draft,
		expectedRevision: 0,
		memberIds: [playerWorkspace.account.personId],
	} satisfies AppAction;
	await assert.rejects(player.client.mutation(api.club.apply, { action }));
	await owner.client.mutation(api.club.apply, { action });
	await owner.client.mutation(api.club.apply, { action });
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: {
				...action,
				draft: { ...draft, name: "Reused request must reject" },
			},
		}),
	);
	const saved = await owner.client.query(api.club.current, {});
	assert(saved);
	const program = saved.data.programs?.find((entry) => entry.id === draft.id);
	assert(program);
	assert.equal(program?.revision, 1);
	assert.equal(
		saved.data.events.filter((event) => event.program === draft.id).length,
		3,
	);
	const event = saved.data.events.find((entry) => entry.program === draft.id);
	assert(event);
	await player.client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: event.id,
			personId: playerWorkspace.account.personId,
			response: "going",
		},
	});
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: {
				type: "respond",
				eventId: event.id,
				personId: workspace.account.personId,
				response: "going",
			},
		}),
	);
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: { ...action, requestId: crypto.randomUUID() },
		}),
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			...action,
			requestId: crypto.randomUUID(),
			draft: programDraft(program),
			expectedRevision: 1,
			memberIds: [],
		},
	});
	const removed = await owner.client.query(api.club.current, {});
	assert.equal(
		removed?.data.responses.find(
			(response) =>
				response.eventId === event.id &&
				response.personId === playerWorkspace.account.personId,
		)?.response,
		"unavailable",
	);
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: { type: "delete-program", id: draft.id, expectedRevision: 2 },
		}),
	);
	const emptyDraft = {
		...draft,
		id: `empty-${crypto.randomUUID()}`,
		name: "Unused program",
		schedule: undefined,
	};
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-program",
			draft: emptyDraft,
			memberIds: [],
			expectedRevision: 0,
		},
	});
	await owner.client.mutation(api.club.apply, {
		action: { type: "delete-program", id: emptyDraft.id, expectedRevision: 1 },
	});
	const resourceProgram = {
		...emptyDraft,
		id: `resource-${crypto.randomUUID()}`,
	};
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-program",
			draft: resourceProgram,
			memberIds: [],
			expectedRevision: 0,
		},
	});
	await owner.client.mutation(api.resources.save, {
		key: crypto.randomUUID(),
		revision: 0,
		title: "Program document",
		description: "Fictional reference",
		kind: "document",
		category: "rules",
		audience: "programs",
		personIds: [],
		programIds: [resourceProgram.id],
		url: "https://example.test/rules",
	});
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: {
				type: "delete-program",
				id: resourceProgram.id,
				expectedRevision: 1,
			},
		}),
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			...action,
			draft: { ...draft, archived: true },
			requestId: crypto.randomUUID(),
			expectedRevision: 2,
			memberIds: [],
		},
	});
	const archived = await owner.client.query(api.club.current, {});
	assert.equal(
		archived?.data.programs?.find((entry) => entry.id === draft.id)?.archived,
		true,
	);
	assert.equal(
		archived?.data.events.find((entry) => entry.id === event.id)?.cancelled,
		false,
	);
	console.log(
		"Programs verified: admin writes, queried-record edits, exactly-once retries, dynamic roster, generated dates, RSVP boundaries, revisions, resource dependencies and archival.",
	);
} finally {
	await run.close();
}
