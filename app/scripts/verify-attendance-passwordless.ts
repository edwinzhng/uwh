import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { attendanceDashboardRows } from "../src/domain/attendance-dashboard";
import { addDays } from "../src/domain/calendar-dates";
import { programRoomId } from "../src/domain/managed-rooms";
import { defaultProgramRsvp } from "../src/domain/programs";
import { localRun } from "./local-checks";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("attendance-passwordless");
try {
	const owner = await run.fixture("Attendance review coach");
	await owner.client.mutation(api.club.create, {
		name: "Attendance verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const player = await run.fixture("Attendance review player");
	await player.client.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	const playerWorkspace = await player.client.query(api.club.current, {});
	assert(playerWorkspace);
	const program = {
		id: "monday-review",
		name: "Monday program",
		status: "active" as const,
		archived: false,
		kind: "hockey" as const,
		seasonId: "2026-2027",
		rsvp: defaultProgramRsvp(),
	};
	const saveRoster = async (
		memberIds: string[],
		revision: number,
	): Promise<void> => {
		await owner.client.mutation(api.club.apply, {
			action: {
				type: "save-program",
				requestId: crypto.randomUUID(),
				draft: program,
				memberIds,
				expectedRevision: revision,
			},
		});
	};
	const personId = playerWorkspace.account.personId;
	await saveRoster([workspace.account.personId, personId], 0);
	const eventIds: string[] = [];
	for (const offset of Array.from({ length: 8 }, (_, index) => index * 7)) {
		const id = `attendance-${offset}`;
		await owner.client.mutation(api.club.apply, {
			action: {
				type: "create-event",
				id,
				draft: {
					title: "Monday practice",
					date: addDays("2026-09-07", offset),
					start: "18:00",
					end: "19:00",
					venue: "MNP Centre",
					program: program.id,
					kind: "hockey",
					repeat: "once",
					seasonId: "2026-2027",
					description: "Isolated attendance verification",
					signupOpens: "now",
				},
			},
		});
		eventIds.push(`${id}-0`);
	}
	for (const eventId of eventIds.slice(0, 4)) {
		await owner.client.mutation(api.club.apply, {
			action: {
				type: "attendance",
				eventId,
				personId: workspace.account.personId,
				attendance: "present",
			},
		});
	}
	for (const eventId of eventIds.slice(0, 2)) {
		await owner.client.mutation(api.club.apply, {
			action: { type: "attendance", eventId, personId, attendance: "present" },
		});
	}
	const start = performance.now();
	const dashboard = await owner.client.query(api.attendance_reports.dashboard, {
		seasonId: "2026-2027",
		programId: program.id,
		weekday: 1,
	});
	assert.equal(dashboard.limited, false);
	assert.equal(dashboard.events, 8);
	const own = dashboard.rows.find(
		(row) => row.id === workspace.account.personId,
	);
	assert.equal(own?.attended, 50);
	assert.equal(own?.recorded, 4);
	assert.equal(own?.total, 8);
	assert.equal(own?.trend, -100);
	assert.equal(
		attendanceDashboardRows(dashboard.rows, "lowest", "all", "").at(0)?.id,
		personId,
	);
	assert.equal(
		attendanceDashboardRows(dashboard.rows, "highest", "all", "").at(0)?.id,
		workspace.account.personId,
	);
	console.log(
		`Complete attendance dashboard verified in ${Math.round(performance.now() - start)} ms.`,
	);
	const summary = await owner.client.query(api.attendance.summary, {
		personId: workspace.account.personId,
		seasonId: "2026-2027",
		now: Date.now(),
	});
	assert.equal(summary?.attended, 50);
	assert.equal(
		(
			await owner.client.query(api.attendance_reports.dashboard, {
				seasonId: "2026-2027",
				programId: program.id,
				weekday: 4,
			})
		).events,
		0,
	);
	await assert.rejects(
		player.client.query(api.attendance_reports.dashboard, {
			seasonId: "2026-2027",
		}),
	);
	const last = eventIds.at(-1);
	assert(last);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-feedback",
			feedback: {
				id: "post-practice",
				personId,
				authorId: workspace.account.id,
				authorName: "Forged name",
				body: "Great recovery after losing possession.",
				kind: "coaching",
				visibility: "published",
				eventId: last,
				date: "2026-10-26",
			},
		},
	});
	const notes = await player.client.query(api.pages.familyFeedback, {});
	assert.equal(
		notes.find((note) => note.id === "post-practice")?.authorName,
		workspace.account.name,
	);
	const privateNote = {
		id: "private-coach-note",
		personId,
		authorId: workspace.account.id,
		body: "Private preparation",
		kind: "coaching" as const,
		visibility: "private" as const,
		eventId: last,
		date: "2026-10-26",
	};
	await owner.client.mutation(api.club.apply, {
		action: { type: "save-feedback", feedback: privateNote },
	});
	assert(
		!(await player.client.query(api.pages.familyFeedback, {})).some(
			(note) => note.id === privateNote.id,
		),
	);
	const video = async (
		audience: "club" | "coaches" | "programs" | "players",
	): Promise<Id<"resources">> =>
		owner.client.mutation(api.resources.save, {
			title: `Training clip ${audience}`,
			description: "Isolated audience verification",
			kind: "video",
			audience,
			personIds: audience === "players" ? [personId] : [],
			programIds: audience === "programs" ? [program.id] : undefined,
			url: "https://youtu.be/abcdefghijk",
			key: crypto.randomUUID(),
			revision: 0,
		});
	const clubVideo = await video("club");
	const coachVideo = await video("coaches");
	const programVideo = await video("programs");
	const personalVideo = await video("players");
	assert(await player.client.query(api.resources.details, { id: clubVideo }));
	assert(
		await player.client.query(api.resources.details, { id: programVideo }),
	);
	assert(
		await player.client.query(api.resources.details, { id: personalVideo }),
	);
	await assert.rejects(
		player.client.query(api.resources.details, { id: coachVideo }),
	);
	await owner.client.mutation(api.messaging.ensureGeneral, {});
	assert(
		(await player.client.query(api.messaging.inbox, {})).some(
			(thread) => thread.id === programRoomId(program.id),
		),
	);
	await saveRoster([workspace.account.personId], 1);
	assert(
		!(await player.client.query(api.messaging.inbox, {})).some(
			(thread) => thread.id === programRoomId(program.id),
		),
	);
	await assert.rejects(
		player.client.query(api.resources.details, { id: programVideo }),
	);
	assert(
		await player.client.query(api.resources.details, { id: personalVideo }),
	);
	await saveRoster([workspace.account.personId, personId], 2);
	assert(
		(await player.client.query(api.messaging.inbox, {})).some(
			(thread) => thread.id === programRoomId(program.id),
		),
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: true },
	});
	assert(
		!(await player.client.query(api.messaging.inbox, {})).some(
			(thread) => thread.id === programRoomId(program.id),
		),
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "set-member-archived", personId, archived: false },
	});
	console.log(
		"Program roster removal/restoration, deactivation, coach notes and club/program/player/coaches-only video audiences verified.",
	);
	const account = await player.client.query(api.account.current, {});
	assert(account);
	await localRun(
		"local_checks:resetMailCooldown",
		internal.local_checks.resetMailCooldown,
		{ email: account.email },
	);
	const anonymous = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	await anonymous.action(api.auth.signIn, {
		provider: "email-link",
		params: { email: account.email, redirectTo: "/email-sign-in" },
	});
	const superseded = await localRun(
		"local_email:latest",
		internal.local_email.latest,
		{ email: account.email },
	);
	assert(superseded && /^[A-Za-z0-9]{32}$/.test(superseded));
	await assert.rejects(
		anonymous.action(api.auth.signIn, {
			provider: "email-link",
			params: { email: account.email, redirectTo: "/email-sign-in" },
		}),
	);
	await localRun(
		"local_checks:resetMailCooldown",
		internal.local_checks.resetMailCooldown,
		{ email: account.email },
	);
	await anonymous.action(api.auth.signIn, {
		provider: "email-link",
		params: { email: account.email, redirectTo: "/email-sign-in" },
	});
	const token = await localRun(
		"local_email:latest",
		internal.local_email.latest,
		{ email: account.email },
	);
	assert(token && token !== superseded);
	await assert.rejects(
		anonymous.action(api.auth.signIn, {
			provider: "email-link",
			params: { code: superseded },
		}),
	);
	const signed = await anonymous.action(api.auth.signIn, {
		provider: "email-link",
		params: { code: token },
	});
	assert(signed.tokens);
	anonymous.setAuth(signed.tokens.token);
	assert.equal(
		(await anonymous.query(api.account.current, {}))?.id,
		account.id,
	);
	assert.equal(
		(await anonymous.query(api.club.current, {}))?.account.personId,
		personId,
	);
	const replay = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	await assert.rejects(
		replay.action(api.auth.signIn, {
			provider: "email-link",
			params: { code: token },
		}),
	);
	await assert.rejects(
		replay.action(api.auth.signIn, {
			provider: "email-link",
			params: { code: "x".repeat(32) },
		}),
	);
	console.log(
		"Passwordless email sign-in preserves the existing account and roster, enforces cooldown, and rejects superseded/used/invalid tokens.",
	);
	if (process.env.UI_REVIEW === "true") {
		const ownerAccount = await owner.client.query(api.account.current, {});
		assert(ownerAccount);
		await Bun.write(
			"/tmp/uwh-attendance-review-login.json",
			JSON.stringify({
				email: ownerAccount.email,
				password: owner.password,
				playerEmail: account.email,
				playerPassword: player.password,
				personId,
				last,
			}),
		);
		console.log("Attendance and email sign-in UI review fixture ready");
		const deadline = Date.now() + 900000;
		while (
			!(await Bun.file("/tmp/uwh-attendance-review-stop").exists()) &&
			Date.now() < deadline
		)
			await Bun.sleep(500);
		await Bun.file("/tmp/uwh-attendance-review-login.json").delete();
	}
} finally {
	await run.close();
}
