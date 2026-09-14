import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const fixtures: { client: ConvexHttpClient; password: string }[] = [];
const fixture = async (name: string): Promise<ConvexHttpClient> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const password = `${crypto.randomUUID()}Aa1!`;
	const result = await signInVerified(client, {
		provider: "password",
		params: {
			flow: "signUp",
			email: `fitness-${crypto.randomUUID()}@example.test`,
			password,
			name,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	fixtures.push({ client, password });
	return client;
};
try {
	const owner = await fixture("Fitness coach");
	const clubId = await owner.mutation(api.club.create, {
		name: "Fitness verification",
		samples: true,
	});
	const outsider = await fixture("Other coach");
	await outsider.mutation(api.club.create, {
		name: "Other fitness club",
		samples: false,
	});
	const parent = await fixture("Player parent");
	await parent.mutation(api.club.requestToJoin, { clubCode: clubId });
	const workspace = await owner.query(api.club.current, { screen: "settings" });
	const request = workspace?.requests.at(0);
	assert(request);
	await owner.mutation(api.club.approveRequest, {
		requestId: request.id,
		personId: "jamie",
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	const testId = await owner.mutation(api.fitness.saveTest, {
		name: "100m swim",
		unit: "time",
	});
	await assert.rejects(parent.query(api.fitness.test, { testId }));
	await assert.rejects(outsider.query(api.fitness.test, { testId }));
	await assert.rejects(
		new ConvexHttpClient(url, { logger: false }).query(api.fitness.test, {
			testId,
		}),
	);
	const seasonId = "2026-2027";
	const create = {
		testId,
		seasonId,
		date: "2026-09-08",
		notes: "Pool length 25m",
	};
	const sessionId = await owner.mutation(api.fitness.saveSession, create);
	await assert.rejects(owner.mutation(api.fitness.saveSession, create));
	await assert.rejects(
		owner.mutation(api.fitness.saveSession, { ...create, date: "2020-01-01" }),
	);
	const first = [
		{ personId: "sam", value: "1:30", notes: "Good turns" },
		{ personId: "jamie", value: "1:20.50", notes: "" },
	];
	assert.equal(
		await owner.mutation(api.fitness.saveResults, {
			sessionId,
			revision: 0,
			entries: first,
		}),
		1,
	);
	await assert.rejects(
		owner.mutation(api.fitness.saveResults, {
			sessionId,
			revision: 0,
			entries: first,
		}),
	);
	await assert.rejects(
		parent.mutation(api.fitness.saveResults, {
			sessionId,
			revision: 1,
			entries: first,
		}),
	);
	await assert.rejects(
		owner.mutation(api.fitness.saveResults, {
			sessionId,
			revision: 1,
			entries: [{ personId: "sam", value: "1:70", notes: "" }],
		}),
	);
	await assert.rejects(
		owner.mutation(api.fitness.saveResults, {
			sessionId,
			revision: 1,
			entries: [...first, ...first],
		}),
	);
	const secondId = await owner.mutation(api.fitness.saveSession, {
		...create,
		date: "2026-09-15",
	});
	await owner.mutation(api.fitness.saveResults, {
		sessionId: secondId,
		revision: 0,
		entries: [{ personId: "sam", value: "1:10", notes: "Personal best" }],
	});
	const rosterArgs = {
		testId,
		seasonId,
		search: "Sam",
		paginationOpts: { cursor: null, numItems: 25 },
	};
	const stats = (await owner.query(api.fitness.roster, rosterArgs)).page.find(
		(row) => row.personId === "sam",
	)?.stats;
	assert(stats);
	assert.equal(stats.count, 2);
	assert.equal(stats.total, 160);
	assert.equal(stats.best, 70);
	const trends = await owner.query(api.fitness.trends, {
		testId,
		seasonId,
		personIds: ["sam", "jamie"],
	});
	assert.equal(trends.at(0)?.points.length, 2);
	assert.equal(trends.at(1)?.points.length, 1);
	await owner.mutation(api.fitness.saveSession, {
		...create,
		sessionId: secondId,
		revision: 1,
		date: "2026-09-16",
	});
	assert.equal(
		(
			await owner.query(api.fitness.trends, {
				testId,
				seasonId,
				personIds: ["sam"],
			})
		)
			.at(0)
			?.points.at(-1)?.date,
		"2026-09-16",
	);
	await owner.mutation(api.fitness.deleteSession, {
		sessionId: secondId,
		revision: 2,
	});
	const remaining = (
		await owner.query(api.fitness.roster, rosterArgs)
	).page.find((row) => row.personId === "sam")?.stats;
	assert.equal(remaining?.count, 1);
	assert.equal(remaining?.best, 90);
	assert.equal(remaining?.total, 90);
	await owner.mutation(api.fitness.saveResults, {
		sessionId,
		revision: 1,
		entries: [{ personId: "sam", value: "", notes: "" }],
	});
	assert.equal(
		(await owner.query(api.fitness.roster, rosterArgs)).page.find(
			(row) => row.personId === "sam",
		)?.stats,
		null,
	);
	assert.equal(
		(await owner.query(api.fitness.session, { sessionId }))?.resultCount,
		1,
	);
	await owner.mutation(api.fitness.archiveTest, {
		testId,
		revision: 0,
		archived: true,
	});
	await assert.rejects(
		owner.mutation(api.fitness.saveResults, {
			sessionId,
			revision: 2,
			entries: first,
		}),
	);
	assert(
		(
			await owner.query(api.fitness.list, {
				archived: true,
				paginationOpts: { cursor: null, numItems: 30 },
			})
		).page.some((test) => test._id === testId),
	);
	await owner.mutation(api.fitness.archiveTest, {
		testId,
		revision: 1,
		archived: false,
	});
	await owner.mutation(api.fitness.saveTest, {
		testId,
		revision: 2,
		name: "100m swim revised",
		unit: "time",
	});
	await assert.rejects(
		owner.mutation(api.fitness.saveTest, {
			testId,
			revision: 3,
			name: "Changed unit",
			unit: "count",
		}),
	);
	for (const unit of ["count", "pass_fail"] as const) {
		const definition = await owner.mutation(api.fitness.saveTest, {
			name: unit,
			unit,
		});
		const session = await owner.mutation(api.fitness.saveSession, {
			...create,
			testId: definition,
		});
		await owner.mutation(api.fitness.saveResults, {
			sessionId: session,
			revision: 0,
			entries: [
				{ personId: "sam", value: unit === "count" ? "0" : "fail", notes: "" },
			],
		});
		const zero = (
			await owner.query(api.fitness.roster, {
				...rosterArgs,
				testId: definition,
			})
		).page.find((row) => row.personId === "sam")?.stats;
		assert.equal(zero?.best, 0);
		assert.equal(zero?.count, 1);
		await owner.mutation(api.fitness.saveResults, {
			sessionId: session,
			revision: 1,
			entries: [
				{
					personId: "sam",
					value: unit === "count" ? "5" : "pass",
					notes: "Updated",
				},
			],
		});
		const corrected = (
			await owner.query(api.fitness.roster, {
				...rosterArgs,
				testId: definition,
			})
		).page.find((row) => row.personId === "sam")?.stats;
		assert.equal(corrected?.total, unit === "count" ? 5 : 1);
		assert.equal(corrected?.count, 1);
	}
	console.log(
		"Fitness checks passed: coach-only access, cross-club isolation, time/count/pass-fail entry, session editing/deletion, best and averages after corrections, trends, archive/restore and stale-write protection.",
	);
} finally {
	for (const fixture of fixtures.toReversed())
		await fixture.client.action(api.account_actions.deleteAccount, {
			password: fixture.password,
		});
}
