import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("parity-followup");
const paginationOpts = { cursor: null, numItems: 8 };
try {
	const owner = await run.fixture("Parity coach");
	await owner.client.mutation(api.club.create, {
		name: "Isolated parity club",
		samples: true,
	});
	const club = await owner.client.query(api.club.current, {
		screen: "settings",
	});
	assert(club?.inviteCode);
	const parent = await run.fixture("Parity guardian");
	await parent.client.mutation(api.club.requestToJoin, {
		clubCode: club.inviteCode,
	});
	const parentAccount = (await parent.client.query(api.club.current, {}))
		?.account;
	assert(parentAccount);
	await owner.client.mutation(api.club.setAccess, {
		accountId: parentAccount.id,
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	const peer = await run.fixture("Parity teammate");
	await peer.client.mutation(api.club.requestToJoin, {
		clubCode: club.inviteCode,
	});
	const outsider = await run.fixture("Parity outside coach");
	await outsider.client.mutation(api.club.create, {
		name: "Other isolated parity club",
		samples: true,
	});
	const anonymous = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	const context = await owner.client.query(api.fitness.logContext, {
		date: "2026-10-26",
		eventId: "club-thu",
	});
	assert(context.practices.some((event) => event.id === "club-thu"));
	await assert.rejects(
		parent.client.query(api.fitness.logContext, { date: "2026-10-26" }),
	);
	const testId = await owner.client.mutation(api.fitness.saveTest, {
		name: "Swim distance",
		unit: "distance",
		lowerIsBetter: false,
	});
	const input = {
		testId,
		eventId: "club-thu",
		personId: "sam",
		value: "42.25",
		notes: "Synthetic swim result",
		operationKey: crypto.randomUUID(),
	};
	await Promise.all([
		owner.client.mutation(api.fitness.logResult, input),
		owner.client.mutation(api.fitness.logResult, input),
	]);
	await assert.rejects(
		owner.client.mutation(api.fitness.logResult, { ...input, value: "50" }),
	);
	await assert.rejects(
		owner.client.mutation(api.fitness.logResult, {
			...input,
			operationKey: crypto.randomUUID(),
		}),
	);
	await assert.rejects(
		parent.client.mutation(api.fitness.logResult, {
			...input,
			personId: "mila",
		}),
	);
	await assert.rejects(
		outsider.client.mutation(api.fitness.logResult, {
			...input,
			personId: "mila",
		}),
	);
	const personalArgs = {
		personId: "sam",
		seasonId: "2026-2027",
		paginationOpts,
	};
	const personal = await parent.client.query(
		api.fitness.personal,
		personalArgs,
	);
	const result = personal.page.find((row) => row.test._id === testId);
	assert.equal(result?.history.length, 1);
	assert.equal(result?.history.at(0)?.value, 42.25);
	assert.equal(result?.stats?.count, 1);
	assert.equal(result?.stats?.best, 42.25);
	await assert.rejects(peer.client.query(api.fitness.personal, personalArgs));
	await assert.rejects(
		parent.client.query(api.fitness.personal, {
			...personalArgs,
			personId: "mila",
		}),
	);
	await assert.rejects(anonymous.query(api.fitness.personal, personalArgs));
	assert(
		!(
			await outsider.client.query(api.fitness.personal, personalArgs)
		).page.some((row) => row.test._id === testId),
	);
	await assert.rejects(parent.client.query(api.fitness.test, { testId }));
	const sessions = await owner.client.query(api.fitness.sessions, {
		testId,
		seasonId: "2026-2027",
		paginationOpts,
	});
	const session = sessions.page.at(0);
	assert.equal(session?.eventId, "club-thu");
	assert.equal(session?.programId, "club");
	assert(session);
	await assert.rejects(
		owner.client.mutation(api.fitness.saveSession, {
			testId,
			sessionId: session._id,
			seasonId: session.seasonId,
			revision: session.revision,
			date: "2026-09-11",
			notes: "Cannot retime linked practice",
		}),
	);
	const hold = await owner.client.mutation(api.fitness.saveTest, {
		name: "Swim endurance time",
		unit: "time",
		lowerIsBetter: false,
	});
	for (const [eventId, value] of [
		["club-thu", "1:20"],
		["hockey-fri", "1:40"],
	])
		await owner.client.mutation(api.fitness.logResult, {
			testId: hold,
			eventId: eventId ?? "",
			personId: "sam",
			value: value ?? "",
			notes: "",
			operationKey: crypto.randomUUID(),
		});
	assert.equal(
		(await parent.client.query(api.fitness.personal, personalArgs)).page.find(
			(row) => row.test._id === hold,
		)?.stats?.best,
		100,
	);
	await owner.client.mutation(api.fitness.saveTest, {
		testId: hold,
		revision: 0,
		name: "Endurance swim",
		unit: "time",
	});
	await assert.rejects(
		owner.client.mutation(api.fitness.saveTest, {
			testId: hold,
			revision: 1,
			name: "Endurance swim",
			unit: "time",
			lowerIsBetter: true,
		}),
	);
	const feedback = {
		id: crypto.randomUUID(),
		kind: "shoutout",
		category: "mvp",
		personId: "sam",
		authorId: "spoofed",
		body: "",
		visibility: "published",
		date: "2026-09-10",
		eventId: "club-thu",
	} as const;
	await parent.client.mutation(api.club.apply, {
		action: { type: "save-feedback", feedback },
	});
	await parent.client.mutation(api.club.apply, {
		action: { type: "save-feedback", feedback },
	});
	const feed = await peer.client.query(api.pages.shoutouts, { paginationOpts });
	const shoutout = feed.page.find((entry) => entry.id === feedback.id);
	assert.equal(shoutout?.authorId, "anonymous");
	assert.equal(shoutout?.personName, "Sam Rivera");
	assert.equal(feed.page.filter((entry) => entry.id === feedback.id).length, 1);
	assert.equal(
		(
			await peer.client.query(api.pages.feedback, {
				personId: "sam",
				visibility: "published",
				kind: "shoutout",
				paginationOpts,
			})
		).page.find((entry) => entry.id === feedback.id)?.authorId,
		"anonymous",
	);
	assert.equal(
		(
			await peer.client.query(api.pages.sessionShoutouts, {
				eventId: "club-thu",
				paginationOpts,
			})
		).page.find((entry) => entry.id === feedback.id)?.authorId,
		"anonymous",
	);
	assert.equal(
		(await parent.client.query(api.pages.familyFeedback, {})).find(
			(entry) => entry.id === feedback.id,
		)?.authorId,
		"anonymous",
	);
	const privateFeedback = {
		...feedback,
		id: crypto.randomUUID(),
		kind: "coaching",
		category: undefined,
		body: "Private synthetic coach note",
		visibility: "private",
	} as const;
	await owner.client.mutation(api.club.apply, {
		action: { type: "save-feedback", feedback: privateFeedback },
	});
	assert(
		!(
			await peer.client.query(api.pages.shoutouts, { paginationOpts })
		).page.some((entry) => entry.id === privateFeedback.id),
	);
	assert(
		!(
			await outsider.client.query(api.pages.shoutouts, { paginationOpts })
		).page.some((entry) => entry.id === feedback.id),
	);
	assert(
		!(await anonymous.query(api.pages.shoutouts, { paginationOpts })).page
			.length,
	);
	assert.equal(
		(
			await peer.client.query(api.pages.recognition, { personId: "sam" })
		).categories.find((entry) => entry.category === "mvp")?.count,
		1,
	);
	await assert.rejects(
		parent.client.mutation(api.club.apply, {
			action: { type: "delete-feedback", id: feedback.id },
		}),
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "delete-feedback", id: feedback.id },
	});
	assert(
		!(
			await peer.client.query(api.pages.shoutouts, { paginationOpts })
		).page.some((entry) => entry.id === feedback.id),
	);
	const clipId = await owner.client.mutation(api.resources.save, {
		key: crypto.randomUUID(),
		revision: 0,
		title: "Turning practice",
		description: "Quiet bubble trail",
		kind: "video",
		audience: "players",
		personIds: ["sam"],
		url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
	});
	for (const search of ["turning", "bubble trail", "sam rivera"])
		assert(
			(
				await parent.client.query(api.resources.list, {
					kind: "video",
					archived: false,
					search,
					paginationOpts: { cursor: null, numItems: 40 },
				})
			).page.some((entry) => entry.id === clipId),
		);
	assert(
		!(
			await peer.client.query(api.resources.list, {
				kind: "video",
				archived: false,
				search: "sam rivera",
				paginationOpts,
			})
		).page.some((entry) => entry.id === clipId),
	);
	await assert.rejects(
		peer.client.query(api.resources.details, { id: clipId }),
	);
	await assert.rejects(
		outsider.client.query(api.resources.details, { id: clipId }),
	);
	console.log(
		"Parity follow-up passed: swim scoring, atomic logging/retry/conflicts, personal/family/coach boundaries, unrelated and cross-club denial, anonymous recognition projections, moderation and title/note/player video search.",
	);
} finally {
	await run.close();
}
