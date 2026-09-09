import { clubTimestamp } from "../src/domain/event-time";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { loadData } from "./data";
import { eraseMessage } from "./moderation";

const removeSignInLimit = async (
	ctx: MutationCtx,
	identifier: string,
): Promise<void> => {
	const limit = await ctx.db
		.query("authRateLimits")
		.withIndex("identifier", (q) => q.eq("identifier", identifier))
		.unique();
	if (limit) await ctx.db.delete(limit._id);
};

const removeFeed = async (
	ctx: MutationCtx,
	feed: Doc<"calendarFeeds">,
): Promise<void> => {
	for (const row of await ctx.db
		.query("calendarEntries")
		.withIndex("by_feed", (q) => q.eq("feedId", feed._id))
		.collect())
		await ctx.db.delete(row._id);
	await ctx.db.delete(feed._id);
};
export const eraseAccount = async (
	ctx: MutationCtx,
	userId: Id<"users">,
	transferTo?: Id<"users">,
): Promise<void> => {
	const user = await ctx.db.get(userId);
	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.first();
	if (membership) {
		const club = await ctx.db.get(membership.clubId);
		const members = await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
			.collect();
		const { rows } = await loadData(ctx, membership.clubId, true);
		const removeClub = club?.ownerId === userId && members.length === 1;
		if (club?.ownerId === userId && !removeClub) {
			const next = members.find(
				(entry) =>
					entry.userId === transferTo && entry.admin && entry.userId !== userId,
			);
			if (!next)
				throw new Error(
					"Choose another admin to own the club before deleting your account.",
				);
			await ctx.db.patch(club._id, { ownerId: next.userId });
		}
		if (removeClub && club) {
			for (const collection of Object.values(rows))
				for (const row of collection) await ctx.db.delete(row._id);
			for (const table of [
				"blocks",
				"chatRestrictions",
				"chatReports",
				"chatPolicies",
				"conversationReads",
				"pushJobs",
				"joinRequests",
				"clubInvites",
				"inviteLimits",
				"seasonRecords",
				"seasonLedger",
				"importReferences",
				"importRuns",
				"publicCalendarEntries",
				"eventAttendanceFlags",
				"playerCoaching",
				"coachingHours",
				"fitnessTests",
				"fitnessSessions",
				"fitnessResults",
				"fitnessStats",
			] as const) {
				for (const row of await ctx.db
					.query(table)
					.withIndex("by_club", (q) => q.eq("clubId", club._id))
					.collect()) {
					if (table === "pushJobs") {
						const jobId = ctx.db.normalizeId("pushJobs", row._id);
						if (jobId)
							for (const delivery of await ctx.db
								.query("pushDeliveries")
								.withIndex("by_job", (q) => q.eq("jobId", jobId))
								.collect())
								await ctx.db.delete(delivery._id);
					}
					await ctx.db.delete(row._id);
				}
			}
			await ctx.db.delete(club._id);
		} else {
			const personIds = new Set([
				membership.personId,
				...membership.children.filter(
					(id) =>
						!members.some(
							(other) =>
								other.userId !== userId &&
								(other.personId === id || other.children.includes(id)),
						),
				),
			]);
			for (const personId of personIds)
				for (const table of [
					"seasonRecords",
					"seasonLedger",
					"importReferences",
					"playerCoaching",
					"coachingHours",
					"fitnessStats",
				] as const)
					for (const row of await ctx.db
						.query(table)
						.withIndex("by_club_person", (q) =>
							q.eq("clubId", membership.clubId).eq("personId", personId),
						)
						.collect())
						await ctx.db.delete(row._id);
			for (const personId of personIds)
				for (const result of await ctx.db
					.query("fitnessResults")
					.withIndex("by_club_person", (q) =>
						q.eq("clubId", membership.clubId).eq("personId", personId),
					)
					.collect()) {
					const session = await ctx.db.get(result.sessionId);
					if (session)
						await ctx.db.patch(session._id, {
							resultCount: Math.max(0, session.resultCount - 1),
							revision: session.revision + 1,
						});
					await ctx.db.delete(result._id);
				}
			for (const table of ["seasonLedger", "importRuns"] as const)
				for (const row of await ctx.db
					.query(table)
					.withIndex("by_actor", (q) => q.eq("actorId", userId))
					.collect())
					await ctx.db.patch(row._id, {
						actor: "Deleted account",
						actorId: undefined,
					});
			for (const row of rows.members.filter((row) =>
				personIds.has(row.value.id),
			))
				await ctx.db.delete(row._id);
			const events = new Map(
				rows.events.map((row) => [row.value.id, row.value]),
			);
			for (const row of rows.responses.filter((row) =>
				personIds.has(row.value.personId),
			)) {
				const event = events.get(row.value.eventId);
				const recorded =
					row.value.attendance !== "unmarked" ||
					row.value.partAttendance?.some(
						(part) => part.attendance !== "unmarked",
					);
				if (
					!recorded &&
					event &&
					clubTimestamp(event.date, event.end, event.timeZone) > Date.now()
				)
					await ctx.db.delete(row._id);
			}

			for (const collection of [rows.loans, rows.charges, rows.payments])
				for (const row of collection.filter((row) =>
					personIds.has(row.value.personId),
				))
					await ctx.db.delete(row._id);
			for (const row of rows.trackerValues.filter((row) =>
				[...personIds].some((id) => row.value.id.endsWith(`:${id}`)),
			))
				await ctx.db.delete(row._id);
			for (const row of rows.feedback) {
				if (
					personIds.has(row.value.personId) ||
					(row.value.authorId === userId &&
						row.value.visibility !== "published")
				)
					await ctx.db.delete(row._id);
				else if (row.value.authorId === userId)
					await ctx.db.patch(row._id, {
						value: { ...row.value, authorId: "deleted-account" },
					});
			}
			for (const row of rows.teams)
				await ctx.db.patch(row._id, {
					value: {
						...row.value,
						black: row.value.black.filter((id) => !personIds.has(id)),
						white: row.value.white.filter((id) => !personIds.has(id)),
						attendees: row.value.attendees.filter((id) => !personIds.has(id)),
						excludedPersonIds: row.value.excludedPersonIds?.filter(
							(id) => !personIds.has(id),
						),
						assignments: row.value.assignments?.filter(
							(entry) => !personIds.has(entry.personId),
						),
					},
				});
			for (const row of rows.messages) {
				if (row.value.accountId === userId) {
					await eraseMessage(ctx, row);
					await ctx.db.patch(row._id, {
						value: {
							...row.value,
							accountId: "deleted-account",
							author: "Deleted account",
							body: "",
							images: [],
							reactions: [],
							replyToId: undefined,
							deleted: true,
						},
					});
				} else if (row.value.reactions)
					await ctx.db.patch(row._id, {
						value: {
							...row.value,
							reactions: row.value.reactions.map((reaction) => ({
								...reaction,
								accountIds: reaction.accountIds.filter((id) => id !== userId),
							})),
						},
					});
			}
			for (const row of rows.conversations.filter((row) =>
				row.value.accountIds.includes(userId),
			))
				await ctx.db.patch(row._id, {
					value: {
						...row.value,
						title:
							row.value.id === "club" || row.value.id === "youth"
								? row.value.title
								: "Former member",
						accountIds: row.value.accountIds.filter((id) => id !== userId),
					},
				});
			for (const row of rows.notices)
				await ctx.db.patch(row._id, {
					value: {
						...row.value,
						acknowledgedBy: row.value.acknowledgedBy.filter(
							(id) => id !== userId,
						),
					},
				});
			for (const member of members.filter((row) =>
				row.children.some((id) => personIds.has(id)),
			))
				await ctx.db.patch(member._id, {
					children: member.children.filter((id) => !personIds.has(id)),
				});
			for (const report of await ctx.db
				.query("chatReports")
				.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
				.collect()) {
				await ctx.db.patch(report._id, {
					reporterId:
						report.reporterId === userId ? undefined : report.reporterId,
					reviewedBy:
						report.reviewedBy === userId ? undefined : report.reviewedBy,
					...(report.subjectId === userId
						? {
								subjectId: undefined,
								author: "Deleted account",
								body: "",
								imageIds: [],
							}
						: {}),
				});
			}
		}
		await ctx.db.delete(membership._id);
	}
	for (const image of await ctx.db
		.query("images")
		.withIndex("by_owner", (q) => q.eq("ownerId", userId))
		.collect()) {
		await ctx.storage.delete(image.storageId);
		await ctx.db.delete(image._id);
	}
	for (const feed of await ctx.db
		.query("calendarFeeds")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.collect())
		await removeFeed(ctx, feed);
	for (const table of [
		"accountConnections",
		"pushPreferences",
		"conversationReads",
		"pushDevices",
		"joinRequests",
		"blocks",
		"chatRestrictions",
	] as const)
		for (const row of await ctx.db
			.query(table)
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect()) {
			if (table === "pushDevices") {
				const deviceId = ctx.db.normalizeId("pushDevices", row._id);
				if (deviceId)
					for (const delivery of await ctx.db
						.query("pushDeliveries")
						.withIndex("by_device", (q) => q.eq("deviceId", deviceId))
						.collect())
						await ctx.db.delete(delivery._id);
			}
			await ctx.db.delete(row._id);
		}
	for (const block of await ctx.db
		.query("blocks")
		.withIndex("by_target", (q) => q.eq("targetId", userId))
		.collect())
		await ctx.db.delete(block._id);
	for (const session of await ctx.db
		.query("authSessions")
		.withIndex("userId", (q) => q.eq("userId", userId))
		.collect()) {
		for (const token of await ctx.db
			.query("authRefreshTokens")
			.withIndex("sessionId", (q) => q.eq("sessionId", session._id))
			.collect())
			await ctx.db.delete(token._id);
		for (const verifier of await ctx.db
			.query("authVerifiers")
			.filter((q) => q.eq(q.field("sessionId"), session._id))
			.collect())
			await ctx.db.delete(verifier._id);
		await ctx.db.delete(session._id);
	}
	for (const account of await ctx.db
		.query("authAccounts")
		.withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
		.collect()) {
		for (const code of await ctx.db
			.query("authVerificationCodes")
			.withIndex("accountId", (q) => q.eq("accountId", account._id))
			.collect())
			await ctx.db.delete(code._id);
		await removeSignInLimit(ctx, account._id);
		await ctx.db.delete(account._id);
	}
	if (user?.email) {
		const email = user.email.trim().toLowerCase();
		for (const limit of await ctx.db
			.query("inviteLimits")
			.withIndex("by_key", (q) => q.eq("key", `email:${email}`))
			.collect())
			await ctx.db.delete(limit._id);
		for (const identifier of new Set([email, user.email]))
			await removeSignInLimit(ctx, identifier);
		for (const table of ["mailLimits", "localEmails", "clubInvites"] as const)
			for (const row of await ctx.db
				.query(table)
				.withIndex("by_email", (q) => q.eq("email", email))
				.collect())
				await ctx.db.delete(row._id);
	}
	for (const invite of await ctx.db
		.query("clubInvites")
		.withIndex("by_sender", (q) => q.eq("createdBy", userId))
		.collect())
		await ctx.db.patch(invite._id, {
			createdBy: undefined,
			...(invite.state === "pending" ? { state: "revoked" as const } : {}),
		});
	if (user) await ctx.db.delete(userId);
};
