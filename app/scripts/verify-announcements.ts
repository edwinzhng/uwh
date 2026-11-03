import assert from "node:assert/strict";
import type { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { Notice } from "../src/domain/app-types";
import { addDays } from "../src/domain/calendar-dates";
import { clubDate } from "../src/domain/event-time";
import type { InboxItem } from "../src/domain/inbox";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("announcements");
const inboxFor = async (
	client: ConvexHttpClient,
	noticeId: string,
): Promise<InboxItem[]> => {
	const page = await client.query(api.inbox.list, {
		unreadOnly: false,
		paginationOpts: { cursor: null, numItems: 40 },
	});
	assert(page.isDone, "The isolated fixture inbox must stay bounded.");
	return page.page.filter(
		(item) =>
			item.target.kind === "announcement" && item.target.noticeId === noticeId,
	);
};
const waitForInbox = async (
	client: ConvexHttpClient,
	noticeId: string,
	attempt = 0,
): Promise<InboxItem> => {
	const rows = await inboxFor(client, noticeId);
	const item = rows.at(0);
	if (item) return item;
	assert(attempt < 40, "The announcement inbox item was not delivered.");
	await Bun.sleep(100);
	return waitForInbox(client, noticeId, attempt + 1);
};

try {
	const owner = await run.fixture("Announcement owner");
	await owner.client.mutation(api.club.create, {
		name: "Fictional announcement verification",
		samples: true,
	});
	const club = await owner.client.query(api.club.current, {});
	assert(club);
	const coach = await run.fixture("Announcement scoped coach");
	const reader = await run.fixture("Announcement reader");
	for (const fixture of [coach, reader])
		await fixture.client.mutation(api.club.requestToJoin, {
			clubCode: club.inviteCode,
		});
	const coachClub = await coach.client.query(api.club.current, {});
	const readerClub = await reader.client.query(api.club.current, {});
	assert(coachClub && readerClub);
	await owner.client.mutation(api.club.setAccess, {
		accountId: coachClub.account.id,
		children: [],
		coachPrograms: ["youth"],
		admin: false,
	});
	await owner.client.mutation(api.club.setAccess, {
		accountId: readerClub.account.id,
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	const outsider = await run.fixture("Announcement other club");
	await outsider.client.mutation(api.club.create, {
		name: "Fictional other announcement club",
		samples: false,
	});
	const today = clubDate(undefined, club.data.timeZone);
	const notice: Notice = {
		id: `verify-notice-${crypto.randomUUID()}`,
		title: "Announcement",
		body: "Bring fins",
		program: "youth",
		date: today,
		expiresAt: addDays(today, 14),
		acknowledgedBy: [],
	};
	await owner.client.mutation(api.club.apply, {
		action: { type: "create-notice", notice },
	});
	const original = (
		await owner.client.query(api.pages.activeNotices, { today })
	).find((entry) => entry.id === notice.id);
	assert(original?.postedAt);
	const inbox = await waitForInbox(reader.client, notice.id);
	await reader.client.mutation(api.inbox.setRead, {
		id: inbox.id as Id<"inboxItems">,
		read: true,
	});
	await owner.client.mutation(api.club.apply, {
		action: { type: "dismiss-notice", noticeId: notice.id },
	});
	const edit = {
		type: "edit-notice" as const,
		noticeId: notice.id,
		body: "Bring two fins",
		expiresAt: addDays(today, 15),
		expectedBody: original.body,
		expectedExpiresAt: original.expiresAt,
	};
	for (const client of [reader.client, outsider.client])
		await assert.rejects(client.mutation(api.club.apply, { action: edit }));
	await coach.client.mutation(api.club.apply, { action: edit });
	await coach.client.mutation(api.club.apply, { action: edit });
	const updated = (
		await owner.client.query(api.pages.activeNotices, { today })
	).find((entry) => entry.id === notice.id);
	assert(updated);
	assert.equal(updated.body, edit.body);
	assert.equal(updated.expiresAt, edit.expiresAt);
	assert.equal(updated.postedAt, original.postedAt);
	assert.equal(updated.date, original.date);
	assert.equal(updated.program, original.program);
	assert.deepEqual(updated.dismissedBy, [club.account.id]);
	const existingInbox = await inboxFor(reader.client, notice.id);
	assert.equal(existingInbox.length, 1);
	assert.equal(existingInbox.at(0)?.id, inbox.id);
	assert(existingInbox.at(0)?.readAt);
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: { ...edit, body: "Stale overwrite" },
		}),
	);
	for (const body of [" ", "x".repeat(501)])
		await assert.rejects(
			owner.client.mutation(api.club.apply, {
				action: {
					...edit,
					expectedBody: updated.body,
					expectedExpiresAt: updated.expiresAt,
					body,
				},
			}),
		);
	await owner.client.mutation(api.club.setAccess, {
		accountId: coachClub.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	await assert.rejects(
		coach.client.mutation(api.club.apply, {
			action: {
				...edit,
				expectedBody: updated.body,
				expectedExpiresAt: updated.expiresAt,
				body: "Revoked coach overwrite",
			},
		}),
	);
	await assert.rejects(
		reader.client.mutation(api.club.apply, {
			action: { type: "expire-notice", noticeId: notice.id },
		}),
	);
	await owner.client.mutation(api.club.apply, {
		action: { type: "expire-notice", noticeId: notice.id },
	});
	assert(
		!(await reader.client.query(api.pages.activeNotices, { today })).some(
			(entry) => entry.id === notice.id,
		),
	);
	await assert.rejects(
		owner.client.mutation(api.club.apply, {
			action: {
				...edit,
				expectedBody: updated.body,
				expectedExpiresAt: today,
				body: "Ended overwrite",
			},
		}),
	);
	console.log(
		"Announcement edit/end, scoped authority, cross-club rejection, stale writes, publication/dismissal preservation, retry and unchanged inbox read state passed.",
	);
} finally {
	await run.close();
}
