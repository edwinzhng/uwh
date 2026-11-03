import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { ScheduleEntry } from "../convex/pages";
import { addDays } from "../src/domain/calendar-dates";
import { clubDate } from "../src/domain/event-time";
import { changedPartResponse } from "../src/domain/schedule-agenda";
import { createVerificationRun } from "./verification-fixtures";

const verification = createVerificationRun("schedule-agenda");
try {
	const fixture = await verification.fixture("Schedule review coach");
	const client = fixture.client;
	await client.mutation(api.club.create, {
		name: "Schedule verification",
		samples: true,
	});
	const workspace = await client.query(api.club.current, {
		screen: "schedule",
	});
	assert(workspace);
	const now = Date.now();
	const today = clubDate(now, "America/Edmonton");
	const create = async (
		id: string,
		offset: number,
		program = "club",
	): Promise<string> => {
		await client.mutation(api.club.apply, {
			action: {
				type: "create-event",
				id,
				draft: {
					title:
						offset < 0
							? "Recent practice"
							: program === "youth"
								? "Youth practice"
								: "Training and hockey",
					date: addDays(today, offset),
					start: "19:00",
					end: "20:30",
					venue: "MNP Centre, 2225 Macleod Trail SE, Calgary",
					program,
					kind: "hockey",
					repeat: "once",
					seasonId: "2026-2027",
					description: "Isolated schedule verification",
					signupOpens: "now",
					parts: [
						{
							id: "training",
							title: "Training",
							kind: "training",
							start: "19:00",
							end: "19:45",
						},
						{
							id: "hockey",
							title: "Hockey",
							kind: "hockey",
							start: "19:45",
							end: "20:30",
						},
					],
				},
			},
		});
		return `${id}-0`;
	};
	await create("agenda-old", -2);
	const recent = await create("agenda-recent", -1);
	await create("agenda-youth-past", -3, "youth");
	const upcoming = await create("agenda-first", 1);
	const youth = await create("agenda-youth", 2, "youth");
	await create("agenda-last", 3);
	assert.equal(
		(await client.query(api.schedule_agenda.recent, { now })).length,
		1,
	);
	assert.equal(
		(await client.query(api.schedule_agenda.recent, { now })).at(0)?.event.id,
		recent,
	);
	const youthPast = await client.query(api.schedule_agenda.recent, {
		now,
		programId: "youth",
	});
	assert.equal(youthPast.at(0)?.event.program, "youth");
	const youthFuture = await client.query(api.schedule_agenda.upcoming, {
		now,
		programId: "youth",
		paginationOpts: { numItems: 20, cursor: null },
	});
	assert.deepEqual(
		youthFuture.page.map((entry) => entry.event.id),
		[youth],
	);
	const pagesFor = async (
		cursor: string | null,
	): Promise<ScheduleEntry[][]> => {
		const page = await client.query(api.schedule_agenda.upcoming, {
			now,
			programId: "club",
			paginationOpts: { numItems: 1, cursor },
		});
		return [
			page.page,
			...(page.isDone ? [] : await pagesFor(page.continueCursor)),
		];
	};
	const pages = await pagesFor(null);
	assert(pages.some((page) => page.length === 0));
	assert.deepEqual(
		pages.flat().map((entry) => entry.event.id),
		[upcoming, "agenda-last-0"],
	);
	const historyPagesFor = async (
		cursor: string | null,
		programId?: string,
	): Promise<ScheduleEntry[][]> => {
		const page = await client.query(api.schedule_agenda.historical, {
			now,
			programId,
			paginationOpts: { numItems: 1, cursor },
		});
		assert(page.page.length <= 1);
		return [
			page.page,
			...(page.isDone
				? []
				: await historyPagesFor(page.continueCursor, programId)),
		];
	};
	const history = await historyPagesFor(null);
	assert(history.some((page) => page.length === 0));
	const historyIds = history.flat().map((entry) => entry.event.id);
	assert.equal(new Set(historyIds).size, historyIds.length);
	assert.deepEqual(
		historyIds.filter((id) => id.startsWith("agenda-")),
		[recent, "agenda-old-0", "agenda-youth-past-0"],
	);
	const clubHistory = (await historyPagesFor(null, "club")).flat();
	assert(clubHistory.every((entry) => entry.event.program === "club"));
	assert.deepEqual(
		clubHistory
			.filter((entry) => entry.event.id.startsWith("agenda-"))
			.map((entry) => entry.event.id),
		[recent, "agenda-old-0"],
	);
	const anonymous = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	await assert.rejects(
		anonymous.query(api.schedule_agenda.historical, {
			now,
			paginationOpts: { numItems: 1, cursor: null },
		}),
	);
	const otherClub = await verification.fixture("Other schedule club");
	await otherClub.client.mutation(api.club.create, {
		name: "Other schedule verification",
		samples: false,
	});
	const unrelated = await otherClub.client.query(
		api.schedule_agenda.historical,
		{ now, paginationOpts: { numItems: 20, cursor: null } },
	);
	assert.deepEqual(unrelated.page, []);
	const detail = await client.query(api.club.current, {
		screen: "session",
		id: upcoming,
	});
	const event = detail?.data.events.find((entry) => entry.id === upcoming);
	assert(event);
	const initial = {
		eventId: upcoming,
		personId: workspace.account.personId,
		response: "unanswered" as const,
		attendance: "unmarked" as const,
	};
	const noTraining = changedPartResponse(event, initial, "training", false);
	await client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: upcoming,
			personId: workspace.account.personId,
			...noTraining,
		},
	});
	const afterNo = await client.query(api.club.current, {
		screen: "session",
		id: upcoming,
	});
	const partial = afterNo?.data.responses.find(
		(entry) =>
			entry.personId === workspace.account.personId &&
			entry.eventId === upcoming,
	);
	assert(partial);
	assert.equal(partial.response, "unanswered");
	assert.deepEqual(partial.declinedPartIds, ["training"]);
	const yesHockey = changedPartResponse(event, partial, "hockey", true);
	await client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: upcoming,
			personId: workspace.account.personId,
			...yesHockey,
		},
	});
	const afterYes = await client.query(api.club.current, {
		screen: "session",
		id: upcoming,
	});
	const response = afterYes?.data.responses.find(
		(entry) =>
			entry.personId === workspace.account.personId &&
			entry.eventId === upcoming,
	);
	assert.equal(response?.response, "going");
	assert.deepEqual(response?.partIds, ["hockey"]);
	assert.deepEqual(response?.declinedPartIds, ["training"]);
	const calendar = await client.query(api.calendar.householdSnapshot, {
		personIds: [workspace.account.personId],
	});
	const calendarEvent = calendar
		.split("BEGIN:VEVENT")
		.find((entry) => entry.includes(upcoming));
	assert(calendarEvent?.includes("Hockey:"));
	assert(!calendarEvent?.includes("Training:"));
	await assert.rejects(
		client.mutation(api.club.apply, {
			action: {
				type: "respond",
				eventId: upcoming,
				personId: workspace.account.personId,
				response: "going",
				partIds: ["hockey"],
				declinedPartIds: ["hockey"],
			},
		}),
	);
	console.log(
		"One recent event, paginated upward history, program filters, club isolation, independent section saves, and contradictory-choice rejection verified.",
	);
	if (process.env.UI_REVIEW === "true") {
		const account = await client.query(api.account.current, {});
		assert(account);
		await Bun.write(
			"/tmp/uwh-agenda-review-login.json",
			JSON.stringify({ email: account.email, password: fixture.password }),
		);
		console.log("Isolated agenda UI fixture ready");
		const deadline = Date.now() + 600000;
		while (
			!(await Bun.file("/tmp/uwh-agenda-review-stop").exists()) &&
			Date.now() < deadline
		)
			await Bun.sleep(500);
		await Bun.file("/tmp/uwh-agenda-review-login.json").delete();
	}
} finally {
	await verification.close();
}
