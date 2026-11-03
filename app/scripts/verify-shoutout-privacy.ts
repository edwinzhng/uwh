import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { clubDate } from "../src/domain/event-time";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("shoutout-privacy");
try {
	const owner = await run.fixture("Privacy review admin");
	await owner.client.mutation(api.club.create, {
		name: "Private shoutout verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const recipient = await run.fixture("Shoutout recipient");
	await recipient.client.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	const recipientWorkspace = await recipient.client.query(api.club.current, {});
	assert(recipientWorkspace);
	const date = clubDate(Date.now(), "America/Edmonton");
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: "privacy-practice",
			draft: {
				title: "Privacy test practice",
				date,
				start: "19:00",
				end: "20:00",
				venue: "Test pool",
				program: "club",
				kind: "hockey",
				repeat: "once",
				seasonId: "2026-2027",
				description: "Isolated privacy verification",
				signupOpens: "now",
			},
		},
	});
	const give = async (id: string, personId: string): Promise<void> => {
		await owner.client.mutation(api.club.apply, {
			action: {
				type: "save-feedback",
				feedback: {
					id,
					personId,
					authorId: workspace.account.id,
					kind: "shoutout",
					visibility: "published",
					body: "Great teamwork at practice.",
					category: "great_session",
					date,
					eventId: "privacy-practice-0",
				},
			},
		});
	};
	await give("privacy-own", workspace.account.personId);
	await give("privacy-other", recipientWorkspace.account.personId);
	const paginationOpts = { numItems: 20, cursor: null };
	const own = await owner.client.query(api.pages.shoutouts, { paginationOpts });
	assert.deepEqual(
		own.page.map((entry) => entry.id),
		["privacy-own"],
	);
	assert(own.page.every((entry) => entry.authorId === "anonymous"));
	const received = await recipient.client.query(api.pages.shoutouts, {
		paginationOpts,
	});
	assert.deepEqual(
		received.page.map((entry) => entry.id),
		["privacy-other"],
	);
	assert.equal(
		(
			await owner.client.query(api.pages.shoutouts, {
				personId: recipientWorkspace.account.personId,
				paginationOpts,
			})
		).page.length,
		0,
	);
	assert.equal(
		(
			await owner.client.query(api.pages.feedback, {
				personId: recipientWorkspace.account.personId,
				kind: "shoutout",
				visibility: "published",
				paginationOpts,
			})
		).page.length,
		0,
	);
	assert.equal(
		(
			await owner.client.query(api.pages.recognition, {
				personId: recipientWorkspace.account.personId,
			})
		).total,
		0,
	);
	assert.equal(
		(
			await recipient.client.query(api.pages.recognition, {
				personId: recipientWorkspace.account.personId,
			})
		).total,
		1,
	);
	assert.deepEqual(
		(
			await owner.client.query(api.pages.sessionShoutouts, {
				eventId: "privacy-practice-0",
				paginationOpts,
			})
		).page.map((entry) => entry.id),
		["privacy-own"],
	);
	assert.deepEqual(
		(
			await recipient.client.query(api.pages.sessionShoutouts, {
				eventId: "privacy-practice-0",
				paginationOpts,
			})
		).page.map((entry) => entry.id),
		["privacy-other"],
	);
	assert.equal(
		(await owner.client.query(api.pages.familyFeedback, {})).some(
			(entry) => entry.id === "privacy-other",
		),
		false,
	);
	const outsider = await run.fixture("Other club viewer");
	await outsider.client.mutation(api.club.create, {
		name: "Separate test club",
		samples: false,
	});
	assert.equal(
		(
			await outsider.client.query(api.pages.feedback, {
				personId: recipientWorkspace.account.personId,
				kind: "shoutout",
				visibility: "published",
				paginationOpts,
			})
		).page.length,
		0,
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "delete-feedback", id: "privacy-own" },
	});
	assert.equal(
		(await owner.client.query(api.pages.shoutouts, { paginationOpts })).page
			.length,
		0,
	);
	console.log(
		"Recipient-only shoutouts, admin isolation, summaries, session feeds, author anonymity and club boundaries verified.",
	);
	if (process.env.UI_REVIEW === "true") {
		const account = await owner.client.query(api.account.current, {});
		assert(account);
		await Bun.write(
			"/tmp/uwh-shoutout-review-login.json",
			JSON.stringify({ email: account.email, password: owner.password }),
		);
		console.log("Empty Home UI fixture ready");
		const deadline = Date.now() + 900000;
		while (
			!(await Bun.file("/tmp/uwh-shoutout-review-show").exists()) &&
			Date.now() < deadline
		)
			await Bun.sleep(500);
		if (Date.now() < deadline) {
			await give("privacy-visible", workspace.account.personId);
			console.log("Received shoutout UI fixture ready");
			while (
				!(await Bun.file("/tmp/uwh-shoutout-review-stop").exists()) &&
				Date.now() < deadline
			)
				await Bun.sleep(500);
		}
		await Bun.file("/tmp/uwh-shoutout-review-login.json").delete();
	}
} finally {
	await run.close();
}
