import { clubTimestamp } from "../src/domain/event-time";
import { removeLineupPeople } from "../src/domain/lineup";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { queueAppleRevocation } from "./apple_grants";
import { loadData } from "./data";
import { eraseDevelopment } from "./development_cleanup";
import { eraseEquipmentLoans } from "./equipment_loans_cleanup";
import { eraseHouseholdLinks } from "./household_cleanup";
import { eraseInbox } from "./inbox_cleanup";
import {
	eraseMemberMerges,
	mergedMemberHistoryIds,
} from "./member_merge_cleanup";
import { eraseMemberProfiles } from "./member_profile_cleanup";
import { eraseChatAnnouncements } from "./message_announcements_cleanup";
import { eraseMessage } from "./moderation";
import { eraseCoachScores } from "./player_coaching";
import { eraseProgramCommands } from "./program_commands";
import { eraseResources } from "./resources_cleanup";
import { eraseSessionCheckins } from "./session_checkins_cleanup";
import { eraseSessionPerformance } from "./session_performance_cleanup";
import { eraseSessionPlans } from "./session_plans_cleanup";
import { eraseTerms } from "./terms_cleanup";
import { eraseThreadTools } from "./thread_tools_cleanup";
import { eraseWebPush } from "./web_push_cleanup";

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
	await queueAppleRevocation(ctx, userId);
	await eraseEquipmentLoans(ctx, { userId, removeClub: false });
	await eraseHouseholdLinks(ctx, { userId, removeClub: false });
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
		if (removeClub)
			await eraseEquipmentLoans(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: true,
			});
		await eraseTerms(ctx, { userId, clubId: membership.clubId, removeClub });
		await eraseInbox(ctx, { userId, clubId: membership.clubId, removeClub });
		await eraseWebPush(ctx, { userId, clubId: membership.clubId, removeClub });
		await eraseChatAnnouncements(ctx, {
			userId,
			clubId: membership.clubId,
			removeClub,
		});
		await eraseProgramCommands(ctx, {
			userId,
			clubId: membership.clubId,
			removeClub,
		});
		await eraseSessionPlans(ctx, membership.clubId, userId, removeClub);
		await eraseThreadTools(ctx, membership.clubId, userId, removeClub);
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
			await eraseHouseholdLinks(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: true,
			});
			await eraseMemberMerges(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: true,
			});
			await eraseMemberProfiles(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: true,
			});
			await eraseSessionCheckins(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: true,
			});
			await eraseSessionPerformance(ctx, {
				clubId: membership.clubId,
				userId,
				removeClub: true,
			});
			await eraseDevelopment(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: true,
			});
			await eraseResources(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: true,
			});
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
				"staffInvites",
				"inviteLimits",
				"seasonRecords",
				"seasonLedger",
				"importReferences",
				"importRuns",
				"publicCalendarEntries",
				"eventAttendanceFlags",
				"playerCoaching",
				"coachingHours",
				"coachingSchedules",
				"coachingScheduleHistory",
				"coachingEventOverrides",
				"fitnessTests",
				"sessionSeries",
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
			await eraseCoachScores(ctx, membership.clubId, userId);
			const personIds = new Set(
				mergedMemberHistoryIds(
					rows.members.map((row) => row.value),
					[
						membership.personId,
						...membership.children.filter(
							(id) =>
								!members.some(
									(other) =>
										other.userId !== userId &&
										(other.personId === id || other.children.includes(id)),
								),
						),
					],
				),
			);
			await eraseMemberMerges(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: false,
				personIds: [...personIds],
			});
			await eraseHouseholdLinks(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: false,
				personIds: [...personIds],
			});
			await eraseMemberProfiles(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: false,
				personIds: [...personIds],
			});
			await eraseEquipmentLoans(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: false,
				personIds: [...personIds],
			});
			await eraseSessionCheckins(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: false,
				personIds: [...personIds],
			});
			await eraseSessionPerformance(ctx, {
				clubId: membership.clubId,
				userId,
				removeClub: false,
				personIds: [...personIds],
			});
			await eraseDevelopment(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: false,
				personIds: [...personIds],
			});
			await eraseResources(ctx, {
				userId,
				clubId: membership.clubId,
				removeClub: false,
				personIds: [...personIds],
			});
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
			for (const row of await ctx.db
				.query("coachingScheduleHistory")
				.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
				.collect()) {
				const coaches = row.coaches.filter(
					(coach) => coach.coachId !== userId && !personIds.has(coach.personId),
				);
				if (coaches.length !== row.coaches.length)
					await ctx.db.patch(row._id, { coaches });
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
					clubTimestamp(
						event.endDate ?? event.date,
						event.end,
						event.timeZone,
					) > Date.now()
				)
					await ctx.db.delete(row._id);
			}

			for (const collection of [rows.loans, rows.charges, rows.payments])
				for (const row of collection.filter(
					(row) => "personId" in row.value && personIds.has(row.value.personId),
				))
					await ctx.db.delete(row._id);
			for (const row of rows.trackerValues.filter((row) =>
				[...personIds].some((id) => row.value.id.endsWith(`:${id}`)),
			))
				await ctx.db.delete(row._id);
			for (const row of rows.feedback) {
				if (personIds.has(row.value.personId) || row.value.authorId === userId)
					await ctx.db.delete(row._id);
			}
			for (const row of rows.teams)
				await ctx.db.patch(row._id, {
					value: { ...row.value, ...removeLineupPeople(row.value, personIds) },
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
			const eraseConversionReceipt = (row: Doc<"conversations">): boolean =>
				Boolean(
					row.groupCreatorId === userId ||
						row.value.accountIds.includes(userId) ||
						row.value.participantPersonIds?.some(
							(id) => id === userId || personIds.has(id),
						) ||
						row.groupSourceRecipientIds?.some(
							(id) =>
								id === userId ||
								(id.startsWith("person:") &&
									personIds.has(id.slice("person:".length))),
						),
				);
			for (const row of rows.conversations.filter(
				(row) =>
					row.value.accountIds.includes(userId) ||
					row.groupCreatorId === userId ||
					row.groupSourceRecipientIds?.some(
						(id) =>
							id === userId ||
							(id.startsWith("person:") &&
								personIds.has(id.slice("person:".length))),
					) ||
					row.groupCreation?.recipientIds.some(
						(id) =>
							id === userId ||
							(id.startsWith("person:") &&
								personIds.has(id.slice("person:".length))),
					) ||
					row.pendingPersonIds?.some((id) => personIds.has(id)) ||
					(row.pendingPersonId && personIds.has(row.pendingPersonId)) ||
					(row.recipientPersonId && personIds.has(row.recipientPersonId)) ||
					row.value.participantPersonIds?.some(
						(id) => id === userId || personIds.has(id),
					),
			))
				await ctx.db.patch(row._id, {
					groupCreatorId:
						row.groupCreatorId === userId ? undefined : row.groupCreatorId,
					groupSourceThreadId: eraseConversionReceipt(row)
						? undefined
						: row.groupSourceThreadId,
					groupSourceRecipientIds: eraseConversionReceipt(row)
						? undefined
						: row.groupSourceRecipientIds,
					groupCreation:
						row.groupCreatorId === userId ||
						row.groupCreation?.recipientIds.some(
							(id) =>
								id === userId ||
								(id.startsWith("person:") &&
									personIds.has(id.slice("person:".length))),
						)
							? undefined
							: row.groupCreation,
					pendingPersonId:
						row.pendingPersonId && personIds.has(row.pendingPersonId)
							? undefined
							: row.pendingPersonId,
					pendingPersonIds: row.pendingPersonIds?.filter(
						(id) => !personIds.has(id),
					),
					recipientPersonId:
						row.recipientPersonId && personIds.has(row.recipientPersonId)
							? undefined
							: row.recipientPersonId,
					directKey:
						row.recipientPersonId && personIds.has(row.recipientPersonId)
							? undefined
							: row.directKey,
					value: {
						...row.value,
						title:
							row.value.id === "club" || row.value.id === "youth"
								? row.value.title
								: "Former member",
						accountIds: row.value.accountIds.filter((id) => id !== userId),
						participantPersonIds: row.value.participantPersonIds?.filter(
							(id) => id !== userId && !personIds.has(id),
						),
					},
				});
			for (const row of rows.notices)
				await ctx.db.patch(row._id, {
					value: {
						...row.value,
						dismissedBy: row.value.dismissedBy?.filter((id) => id !== userId),
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
					reason:
						report.reporterId === userId
							? "Reporter deleted account."
							: report.reason,
					reporterId:
						report.reporterId === userId ? undefined : report.reporterId,
					reviewedBy:
						report.reviewedBy === userId ? undefined : report.reviewedBy,
					...(report.subjectId === userId
						? {
								subjectId: undefined,
								author: "Deleted account",
								body: "",
								source: undefined,
								contentSource: undefined,
								imageIds: [],
							}
						: {}),
				});
			}
		}
		await ctx.db.delete(membership._id);
	} else {
		await eraseInbox(ctx, { userId, removeClub: false });
		await eraseWebPush(ctx, { userId, removeClub: false });
		await eraseChatAnnouncements(ctx, { userId, removeClub: false });
		await eraseTerms(ctx, { userId, removeClub: false });
		await eraseProgramCommands(ctx, { userId, removeClub: false });
	}
	for (const image of await ctx.db
		.query("images")
		.withIndex("by_owner", (q) => q.eq("ownerId", userId))
		.collect()) {
		if (image.chatAvatar) {
			const thread = await ctx.db
				.query("conversations")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", image.clubId).eq("value.id", image.threadId),
				)
				.unique();
			if (thread?.value.avatarImageId === image._id)
				await ctx.db.patch(thread._id, {
					value: { ...thread.value, avatarImageId: undefined },
				});
		}
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
	for (const invite of await ctx.db
		.query("staffInvites")
		.withIndex("by_sender", (q) => q.eq("createdBy", userId))
		.collect())
		await ctx.db.patch(invite._id, { createdBy: undefined, revoked: true });
	for (const invite of await ctx.db
		.query("staffInvites")
		.withIndex("by_owner", (q) => q.eq("ownerAtIssue", userId))
		.collect())
		await ctx.db.patch(invite._id, { ownerAtIssue: undefined, revoked: true });
	if (user) await ctx.db.delete(userId);
};
