import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { createVerificationRun } from "./verification-fixtures";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const run = createVerificationRun("development");
const fixture = async (name: string): Promise<ConvexHttpClient> =>
	(await run.fixture(name)).client;

const verify = async (): Promise<void> => {
	const owner = await fixture("Development coach A");
	await owner.mutation(api.club.create, {
		name: "Development verification",
		samples: true,
	});
	const inviteCode = (
		await owner.query(api.club.current, { screen: "settings" })
	)?.inviteCode;
	assert(inviteCode);
	const join = async (
		name: string,
		coachPrograms: string[],
		admin = false,
	): Promise<ConvexHttpClient> => {
		const client = await fixture(name);
		await client.mutation(api.club.requestToJoin, { clubCode: inviteCode });
		const joined = await client.query(api.account.current, {});
		assert(joined);
		await owner.mutation(api.club.setAccess, {
			accountId: joined.id,
			children: [],
			coachPrograms,
			admin,
		});
		return client;
	};
	const coach = await join("Development coach B", ["club"]);
	const admin = await join("Development admin", [], true);
	const player = await join("Development player", []);
	const outsider = await fixture("Development outsider");
	await outsider.mutation(api.club.create, {
		name: "Other development club",
		samples: true,
	});
	const anonymous = new ConvexHttpClient(url, { logger: false });
	for (const client of [anonymous, admin, player]) {
		await assert.rejects(
			client.query(api.development.player, { personId: "alex" }),
		);
		await assert.rejects(
			client.query(api.development.overview, {
				paginationOpts: { cursor: null, numItems: 20 },
			}),
		);
		await assert.rejects(
			client.mutation(api.development.save, {
				personId: "alex",
				round: 1,
				revision: 0,
				rating: 80,
				observation: "",
				submit: true,
			}),
		);
		await assert.rejects(
			client.mutation(api.development.finalize, {
				personId: "alex",
				round: 1,
				revision: 0,
			}),
		);
		await assert.rejects(
			client.mutation(api.development.reopen, {
				personId: "alex",
				round: 1,
				revision: 0,
			}),
		);
	}
	const draft = {
		personId: "alex",
		round: 1,
		revision: 0,
		rating: 70,
		observation: "Private draft",
		submit: false,
	};
	await owner.mutation(api.development.save, draft);
	await assert.rejects(
		owner.mutation(api.development.save, {
			...draft,
			revision: 1,
			rating: 101,
		}),
	);
	await assert.rejects(owner.mutation(api.development.save, draft));
	const authorView = await owner.query(api.development.player, {
		personId: "alex",
	});
	const otherView = await coach.query(api.development.player, {
		personId: "alex",
	});
	assert(authorView && otherView);
	assert.equal(authorView.ownReview?.observation, "Private draft");
	assert.equal(otherView.ownReview, undefined);
	assert.equal(otherView.average, undefined);
	assert.deepEqual(otherView.observations, []);
	assert.equal(otherView.requiredCount, 2);
	const external = await outsider.query(api.development.player, {
		personId: "alex",
	});
	assert(external);
	assert.equal(external.round, undefined);
	assert.equal(external.average, undefined);
	await owner.mutation(api.development.save, {
		...draft,
		revision: 1,
		submit: true,
	});
	const partial = await owner.query(api.development.player, {
		personId: "alex",
	});
	assert(partial?.round);
	await assert.rejects(
		owner.mutation(api.development.finalize, {
			personId: "alex",
			round: 1,
			revision: partial.round.revision,
		}),
	);
	await coach.mutation(api.development.save, {
		...draft,
		rating: 90,
		observation: "Submitted observation",
		submit: true,
	});
	const complete = await owner.query(api.development.player, {
		personId: "alex",
	});
	assert(complete?.round);
	assert.equal(complete.average, 80);
	assert.equal(complete.canFinalize, true);
	await owner.mutation(api.club.apply, {
		action: { type: "generate-teams", eventId: "club-thu" },
	});
	await owner.mutation(api.club.apply, {
		action: { type: "publish-teams", eventId: "club-thu" },
	});
	const attempts = await Promise.allSettled(
		[owner, coach].map((client) =>
			client.mutation(api.development.finalize, {
				personId: "alex",
				round: 1,
				revision: complete.round?.revision ?? 0,
			}),
		),
	);
	assert.equal(
		attempts.filter((result) => result.status === "fulfilled").length,
		1,
	);
	const finalized = await owner.query(api.development.player, {
		personId: "alex",
	});
	assert(finalized?.round);
	assert.equal(finalized.round.status, "finalized");
	assert.equal(finalized.profile.rating, 80);
	assert.equal(finalized.profile.revision, complete.profile.revision + 1);
	const invalidated = (
		await owner.query(api.club.current, {})
	)?.data.teams.find((team) => team.eventId === "club-thu");
	assert.equal(invalidated?.coachingStale, true);
	assert.equal(invalidated?.published, false);
	await assert.rejects(
		owner.mutation(api.development.save, {
			...draft,
			revision: 2,
			submit: true,
		}),
	);
	await owner.mutation(api.development.reopen, {
		personId: "alex",
		round: 1,
		revision: finalized.round.revision,
	});
	const reopened = await owner.query(api.development.player, {
		personId: "alex",
	});
	assert(reopened);
	assert.equal(reopened.round?.round, 2);
	assert.equal(reopened.profile.rating, 80);
	assert.equal(reopened.ownReview, undefined);
	await owner.mutation(api.development.save, {
		...draft,
		round: 2,
		submit: true,
	});
	await owner.mutation(api.player_coaching.save, {
		...reopened.profile,
		rating: 88,
	});
	const staleProfile = await owner.query(api.development.player, {
		personId: "alex",
	});
	assert(staleProfile?.round);
	assert.equal(staleProfile.profileChanged, true);
	await assert.rejects(
		owner.mutation(api.development.finalize, {
			personId: "alex",
			round: 2,
			revision: staleProfile.round.revision,
		}),
	);
	await owner.mutation(api.development.reopen, {
		personId: "alex",
		round: 2,
		revision: staleProfile.round.revision,
	});
	const third = await owner.query(api.development.player, { personId: "alex" });
	assert(third?.round);
	await owner.mutation(api.development.save, { ...draft, round: 3 });
	await join("Development coach C", ["club"]);
	const changedRoster = await owner.query(api.development.player, {
		personId: "alex",
	});
	assert(changedRoster?.round);
	assert.equal(changedRoster.rosterChanged, true);
	await owner.mutation(api.development.reopen, {
		personId: "alex",
		round: 3,
		revision: changedRoster.round.revision,
	});
	const fourth = await owner.query(api.development.player, {
		personId: "alex",
	});
	assert(fourth);
	assert.equal(
		await owner.query(api.development.player, { personId: "missing-player" }),
		null,
	);
	assert.equal(fourth.round?.round, 4);
	assert.equal(fourth.requiredCount, 3);
	const seededPlayerIds = Array.from(
		{ length: 21 },
		(_, index) => `pagination-player-${index}`,
	);
	for (const personId of seededPlayerIds)
		await owner.mutation(api.club.apply, {
			action: {
				type: "add-member",
				charge: 0,
				member: {
					id: personId,
					name: personId,
					programs: ["club"],
					position: "Forward",
					rating: 50,
					registration: "approved",
					goal: "Pagination verification",
					steps: 0,
				},
			},
		});
	const archivedPersonId = seededPlayerIds.at(0);
	assert(archivedPersonId);
	await owner.mutation(api.club.apply, {
		action: {
			type: "set-member-archived",
			personId: archivedPersonId,
			archived: true,
		},
	});
	const oversizedPage = await owner.query(api.development.overview, {
		paginationOpts: {
			cursor: null,
			numItems: 10000,
			maximumRowsRead: 1000000,
		},
	});
	assert.equal(oversizedPage.page.length, 20);
	assert.equal(oversizedPage.isDone, false);
	const remainingPage = await owner.query(api.development.overview, {
		paginationOpts: {
			cursor: oversizedPage.continueCursor,
			numItems: 10000,
			maximumRowsRead: 1000000,
		},
	});
	assert.equal(remainingPage.isDone, true);
	assert(remainingPage.page.length <= 20);
	const visiblePlayerIds = [...oversizedPage.page, ...remainingPage.page].map(
		(entry) => entry.member.id,
	);
	assert.equal(new Set(visiblePlayerIds).size, visiblePlayerIds.length);
	assert.equal(visiblePlayerIds.includes(archivedPersonId), false);
	assert(
		seededPlayerIds
			.filter((personId) => personId !== archivedPersonId)
			.every((personId) => visiblePlayerIds.includes(personId)),
	);
	assert.equal(
		(await owner.query(api.development.player, { personId: archivedPersonId }))
			?.member.archived,
		true,
	);
	assert.equal(
		(
			await owner.query(api.development.overview, {
				paginationOpts: { cursor: null, numItems: 0 },
			})
		).page.length,
		1,
	);
	console.log(
		"Development checks passed: coach-only access, club isolation, private drafts, ranges, author/round revision conflicts, submitted aggregate, explicit finalize/reopen, concurrent finalization, authoritative rating revisions, stale teams, changed coach/profile snapshots and bounded cursor pagination excluding archived players.",
	);
};

const results = await Promise.allSettled([verify()]);
const cleanup = await Promise.allSettled([run.close()]);
const result = results.at(0);
if (result?.status === "rejected") throw result.reason;
const cleanupResult = cleanup.at(0);
if (cleanupResult?.status === "rejected") throw cleanupResult.reason;
