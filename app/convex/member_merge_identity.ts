import { mergeCollision } from "../src/domain/core-member-merge";
import {
	memberMergeFingerprint,
	memberMergeLimits,
} from "../src/domain/member-merge";
import {
	memberIdentityConflicts,
	mergedAccount,
} from "../src/domain/member-merge-identity";
import type { QueryCtx } from "./_generated/server";
import { accountFor } from "./identity";
import { mergeScanConflicts } from "./member_merge_core";
import type {
	MemberMergeContext,
	MemberMergeModule,
} from "./member_merge_types";

export const planIdentityMemberMerge = async (
	ctx: QueryCtx,
	input: MemberMergeContext,
): Promise<MemberMergeModule> => {
	const [memberships, feeds, invites, householdLinks] = await Promise.all([
		ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("calendarFeeds")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("clubInvites")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("householdLinks")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.take(memberMergeLimits.rows + 1),
	]);
	const affected = memberships.filter(
		(row) =>
			row.personId === input.source.id ||
			row.children.includes(input.source.id) ||
			row.defaultPersonId === input.source.id,
	);
	const sourceFeeds = feeds.filter((row) => row.personId === input.source.id);
	const sourceInvites = invites.filter(
		(row) => row.personId === input.source.id,
	);
	const sourceAudience = memberships.some(
		(row) =>
			row.personId === input.source.id ||
			row.children.includes(input.source.id),
	);
	const targetAudience = memberships.some(
		(row) =>
			row.personId === input.target.id ||
			row.children.includes(input.target.id),
	);
	const claimedAudienceInvites = invites.filter(
		(row) =>
			row.state === "pending" &&
			row.expiresAt > Date.now() &&
			(sourceAudience || targetAudience) &&
			(row.personId === input.source.id || row.personId === input.target.id),
	);
	const conflicts = [
		...memberIdentityConflicts(memberships.map(accountFor), input),
		...mergeScanConflicts("Account identities", memberships),
		...mergeScanConflicts("Calendar feeds", feeds),
		...mergeScanConflicts("Invitations", invites),
		...mergeScanConflicts("Household proofs", householdLinks),
		...householdLinks
			.filter(
				(row) =>
					row.state === "available" &&
					[input.source.id, input.target.id].includes(row.personId),
			)
			.map(() =>
				mergeCollision(
					"Household invitations",
					"Pending guardian link or relink",
					"A pending household proof could restore a different private audience after this merge.",
					"Accept or dismiss the pending guardian link in that account’s household settings before merging.",
				),
			),
		...claimedAudienceInvites.map((row) =>
			mergeCollision(
				"Invitations",
				`Pending invitation for ${row.personId === input.source.id ? input.source.name : input.target.name}`,
				"A pending login invitation could claim the other profile’s existing private household history after merging.",
				"Revoke this pending invitation and review the intended account identity before merging.",
			),
		),
		...sourceFeeds
			.filter((row) =>
				feeds.some(
					(other) =>
						other.personId === input.target.id && other.userId === row.userId,
				),
			)
			.map(() =>
				mergeCollision(
					"Calendar feeds",
					"Private calendar subscription",
					"The same account has separate calendar subscriptions for both profiles.",
					"Revoke one duplicate calendar subscription in Account before merging; existing calendar tokens will not be silently replaced.",
				),
			),
		...sourceInvites
			.filter(
				(row) =>
					row.state === "pending" &&
					invites.some(
						(other) =>
							other.personId === input.target.id &&
							other.state === "pending" &&
							other.email !== row.email,
					),
			)
			.map(() =>
				mergeCollision(
					"Invitations",
					"Pending account invitation",
					"Different pending email invitations would connect the same canonical identity.",
					"Revoke the extra pending invitation before merging.",
				),
			),
	];
	return {
		counts: [
			{ label: "Household account links relinked", count: affected.length },
			{ label: "Private calendar feeds relinked", count: sourceFeeds.length },
			{ label: "Invitation history relinked", count: sourceInvites.length },
			{
				label: "Guardian identity proofs relinked",
				count: householdLinks.filter((row) => row.personId === input.source.id)
					.length,
			},
		],
		conflicts,
		fingerprint: memberMergeFingerprint([
			JSON.stringify(memberships),
			JSON.stringify(feeds),
			JSON.stringify(invites),
			JSON.stringify(householdLinks),
		]),
		apply: async (write): Promise<void> => {
			if (conflicts.length)
				throw new Error("Resolve account identity conflicts first.");
			for (const row of affected) {
				const next = mergedAccount(accountFor(row), input);
				await write.db.patch(row._id, {
					personId: next.personId,
					name: next.name,
					children: next.children,
					defaultPersonId:
						row.defaultPersonId === input.source.id
							? input.target.id
							: row.defaultPersonId,
				});
				if (row.personId === input.source.id)
					await write.db.patch(row.userId, { name: next.name });
			}
			for (const row of sourceFeeds)
				await write.db.patch(row._id, { personId: input.target.id });
			for (const row of sourceInvites)
				await write.db.patch(row._id, {
					personId: input.target.id,
					revision: row.revision + 1,
				});
			for (const row of householdLinks.filter(
				(link) => link.personId === input.source.id,
			))
				await write.db.patch(row._id, { personId: input.target.id });
		},
	};
};
