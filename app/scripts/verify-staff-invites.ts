import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import { localRun } from "./local-checks";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("staff-invites");
try {
	const owner = await run.fixture("Staff owner");
	await owner.client.mutation(api.club.create, {
		name: "Fictional staff invite club",
		samples: true,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const member = await run.fixture("Ordinary member");
	await member.client.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	assert.equal(
		(await member.client.query(api.club.current, {}))?.account.admin,
		false,
	);
	await assert.rejects(
		member.client.mutation(api.staff_invites.create, {
			admin: true,
			coachPrograms: ["club"],
		}),
		/Administrator/,
	);
	await assert.rejects(
		member.client.query(api.staff_invites.list, {}),
		/Administrator/,
	);
	await assert.rejects(
		owner.client.mutation(api.staff_invites.create, {
			admin: false,
			coachPrograms: ["missing"],
		}),
		/valid staff/,
	);
	const code = await owner.client.mutation(api.staff_invites.create, {
		admin: true,
		coachPrograms: ["club"],
	});
	assert.match(code, /^[A-Z2-9]{32}$/);
	const anonymous = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	await assert.rejects(
		anonymous.mutation(api.club.requestToJoin, { clubCode: code }),
		/Sign in first/,
	);
	const listing = await owner.client.query(api.staff_invites.list, {});
	assert.equal(JSON.stringify(listing).includes(code), false);
	const invite = listing.invites.at(0);
	assert(invite);
	assert.equal("hash" in invite, false);
	await assert.rejects(
		member.client.mutation(api.staff_invites.revoke, { id: invite.id }),
		/unavailable/,
	);
	const staff = await run.fixture("Invited administrator");
	await staff.client.mutation(api.club.requestToJoin, {
		clubCode: code.toLowerCase(),
	});
	const staffWorkspace = await staff.client.query(api.club.current, {});
	assert(staffWorkspace?.account.admin);
	assert.deepEqual(staffWorkspace.account.coachPrograms, ["club"]);
	assert.equal(staffWorkspace.clubId, workspace.clubId);
	await assert.rejects(
		staff.client.mutation(api.staff_invites.create, {
			admin: true,
			coachPrograms: [],
		}),
		/Only the club owner/,
	);
	for (const index of [1, 2, 3]) {
		const joiner = await run.fixture(`Invited staff ${index}`);
		await joiner.client.mutation(api.club.requestToJoin, { clubCode: code });
	}
	const last = await run.fixture("Last staff slot");
	const excess = await run.fixture("Concurrent excess staff");
	const outcomes = await Promise.allSettled(
		[last, excess].map((fixture) =>
			fixture.client.mutation(api.club.requestToJoin, { clubCode: code }),
		),
	);
	assert.equal(
		outcomes.filter((result) => result.status === "fulfilled").length,
		1,
	);
	assert.equal(
		(await owner.client.query(api.staff_invites.list, {})).invites.find(
			(item) => item.id === invite.id,
		)?.uses,
		5,
	);
	const outsider = await run.fixture("Outside club owner");
	await outsider.client.mutation(api.club.create, {
		name: "Other fictional club",
		samples: false,
	});
	await assert.rejects(
		outsider.client.mutation(api.staff_invites.revoke, { id: invite.id }),
		/unavailable/,
	);
	const waiting = outcomes.at(0)?.status === "fulfilled" ? excess : last;
	await assert.rejects(
		waiting.client.mutation(api.club.requestToJoin, { clubCode: code }),
		/unavailable/,
	);
	const revokedCode = await owner.client.mutation(api.staff_invites.create, {
		admin: false,
		coachPrograms: ["club"],
	});
	const revoked = (
		await owner.client.query(api.staff_invites.list, {})
	).invites.at(0);
	assert(revoked);
	await owner.client.mutation(api.staff_invites.revoke, { id: revoked.id });
	await assert.rejects(
		waiting.client.mutation(api.club.requestToJoin, { clubCode: revokedCode }),
		/unavailable/,
	);
	const expiredCode = await owner.client.mutation(api.staff_invites.create, {
		admin: false,
		coachPrograms: ["club"],
	});
	const expired = (
		await owner.client.query(api.staff_invites.list, {})
	).invites.at(0);
	assert(expired);
	await localRun(
		"local_staff_invites:expire",
		internal.local_staff_invites.expire,
		{ id: expired.id },
	);
	await assert.rejects(
		waiting.client.mutation(api.club.requestToJoin, { clubCode: expiredCode }),
		/unavailable/,
	);
	const delegatedCode = await staff.client.mutation(api.staff_invites.create, {
		admin: false,
		coachPrograms: ["club"],
	});
	await owner.client.mutation(api.club.setAccess, {
		accountId: staffWorkspace.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	await assert.rejects(
		waiting.client.mutation(api.club.requestToJoin, {
			clubCode: delegatedCode,
		}),
		/unavailable/,
	);
	const operatorCode = await localRun(
		"local_staff_invites:operatorInvite",
		internal.local_staff_invites.operatorInvite,
		{ clubId: workspace.clubId },
	);
	const operatorReviewer = await run.fixture("Operator invited reviewer");
	await operatorReviewer.client.mutation(api.club.requestToJoin, {
		clubCode: operatorCode,
	});
	assert(
		(await operatorReviewer.client.query(api.club.current, {}))?.account.admin,
	);
	const memberInfo = await member.client.query(api.account.current, {});
	assert(memberInfo);
	const mismatched = await localRun(
		"local_staff_invites:operatorInvite",
		internal.local_staff_invites.operatorInvite,
		{ clubId: workspace.clubId, mismatchedOwner: memberInfo.id },
	);
	await assert.rejects(
		waiting.client.mutation(api.club.requestToJoin, { clubCode: mismatched }),
		/unavailable/,
	);
	await assert.rejects(
		localRun("app_review_access:prepare", internal.app_review_access.prepare, {
			clubId: workspace.clubId,
			confirmation: "Prepare staff access for the fictional App Review club",
		}),
		/fictional App Review club/,
	);
	for (const item of (
		await owner.client.query(api.staff_invites.list, {})
	).invites.filter((item) => !item.revoked))
		await owner.client.mutation(api.staff_invites.revoke, { id: item.id });
	await Promise.all(
		Array.from(
			{ length: 5 },
			(): Promise<string> =>
				owner.client.mutation(api.staff_invites.create, {
					admin: false,
					coachPrograms: ["club"],
				}),
		),
	);
	await assert.rejects(
		owner.client.mutation(api.staff_invites.create, {
			admin: false,
			coachPrograms: ["club"],
		}),
		/Revoke an unused/,
	);
	console.log(
		"Staff invite checks passed: normal sign-in required, member and cross-club isolation, owner-only admin grants, scoped coaching, hashed codes, concurrent usage limits, expiry, revocation and issuer authority loss.",
	);
} finally {
	await run.close();
}
