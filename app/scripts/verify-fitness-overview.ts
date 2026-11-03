import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("fitness-overview");
try {
	const owner = await run.fixture("Fictional fitness coach");
	await owner.client.mutation(api.club.create, {
		name: "Fitness overview verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const player = await run.fixture("Fictional fitness player");
	await player.client.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	const other = await player.client.query(api.club.current, {});
	assert(other);
	const outsider = await run.fixture("Other fitness club");
	await outsider.client.mutation(api.club.create, {
		name: "Other fitness club",
		samples: false,
	});
	const season = workspace.data.seasons.at(0);
	assert(season);
	const tests = await Promise.all([
		owner.client.mutation(api.fitness.saveTest, {
			name: "Sprint",
			unit: "time",
		}),
		owner.client.mutation(api.fitness.saveTest, {
			name: "Lengths",
			unit: "count",
		}),
		owner.client.mutation(api.fitness.saveTest, {
			name: "Safety",
			unit: "pass_fail",
		}),
	]);
	const sprint = tests.at(0);
	const lengths = tests.at(1);
	const safety = tests.at(2);
	assert(sprint && lengths && safety);
	for (const [testId, value, date] of [
		[sprint, "0:40", season.start],
		[sprint, "0:42", `${season.start.slice(0, 8)}02`],
		[lengths, "0", season.start],
		[safety, "pass", season.start],
	] as const) {
		const sessionId = await owner.client.mutation(api.fitness.saveSession, {
			testId,
			seasonId: season.id,
			date,
			notes: "",
		});
		await owner.client.mutation(api.fitness.saveResults, {
			sessionId,
			revision: 0,
			entries: [
				{ personId: workspace.account.personId, value, notes: "" },
				...(testId === sprint && value === "0:40"
					? [{ personId: other.account.personId, value: "0:39", notes: "" }]
					: []),
			],
		});
	}
	const request = {
		seasonId: season.id,
		personId: workspace.account.personId,
		paginationOpts: { cursor: null, numItems: 2 },
	};
	const page = await owner.client.query(api.fitness_overview.read, request);
	assert.equal(page.page.length, 2);
	const next = await owner.client.query(api.fitness_overview.read, {
		...request,
		paginationOpts: { cursor: page.continueCursor, numItems: 2 },
	});
	const rows = [...page.page, ...next.page];
	assert.equal(rows.length, 3);
	const time = rows.find((row) => row.test._id === sprint);
	assert.equal(time?.personal?.best, 40);
	assert.equal(time?.latest?.value, 42);
	assert.equal(time?.teamBest?.value, 39);
	assert.equal(time?.teamBest?.name, other.account.name);
	assert.equal(rows.find((row) => row.test._id === lengths)?.personal?.best, 0);
	assert.equal(rows.find((row) => row.test._id === safety)?.personal?.best, 1);
	await assert.rejects(player.client.query(api.fitness_overview.read, request));
	assert.deepEqual(
		(await outsider.client.query(api.fitness_overview.read, request)).page,
		[],
	);
	await assert.rejects(
		outsider.client.query(api.fitness_overview.read, {
			...request,
			personId: other.account.personId,
		}),
	);
	await assert.rejects(
		owner.client.query(api.fitness_overview.read, {
			...request,
			personId: "missing",
		}),
	);
	await owner.client.mutation(api.fitness.archiveTest, {
		testId: safety,
		revision: 0,
		archived: true,
	});
	assert.equal(
		(
			await owner.client.query(api.fitness_overview.read, {
				...request,
				paginationOpts: { cursor: null, numItems: 10 },
			})
		).page.length,
		2,
	);
	console.log(
		"PASS: indexed all-test fitness overview, lower/higher best direction, latest vs personal best, zero/pass values, paginated tests, archive, coach-only and cross-club access.",
	);
} finally {
	await run.close();
}
