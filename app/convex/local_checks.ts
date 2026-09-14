import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";

const requireLocal = (): void => {
	if (
		process.env.AUTH_EMAIL_MODE !== "local" ||
		process.env.PUSH_DELIVERY_ENABLED === "true" ||
		!/^http:\/\/(127\.0\.0\.1|localhost):/.test(
			process.env.CONVEX_CLOUD_URL ?? "",
		)
	)
		throw new Error("Local checks require isolated transports.");
};
export const inspect = internalQuery({
	args: { userId: v.id("users"), clubId: v.id("clubs") },
	handler: async (
		ctx,
		{ userId, clubId },
	): Promise<{
		exists: boolean;
		sessions: number;
		accounts: number;
		images: number;
		feeds: number;
		devices: number;
		reads: number;
		jobs: Doc<"pushJobs">[];
		deliveries: Doc<"pushDeliveries">[];
	}> => {
		requireLocal();
		const user = await ctx.db.get(userId);
		if (user && !user.email?.endsWith("@example.test"))
			throw new Error("Use fictional accounts.");
		const jobs = await ctx.db
			.query("pushJobs")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		const deliveries = await Promise.all(
			jobs.map((job) =>
				ctx.db
					.query("pushDeliveries")
					.withIndex("by_job", (q) => q.eq("jobId", job._id))
					.collect(),
			),
		);
		return {
			reads: (
				await ctx.db
					.query("conversationReads")
					.withIndex("by_user", (q) => q.eq("userId", userId))
					.collect()
			).length,
			exists: Boolean(user),
			sessions: (
				await ctx.db
					.query("authSessions")
					.withIndex("userId", (q) => q.eq("userId", userId))
					.collect()
			).length,
			accounts: (
				await ctx.db
					.query("authAccounts")
					.withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
					.collect()
			).length,
			images: (
				await ctx.db
					.query("images")
					.withIndex("by_owner", (q) => q.eq("ownerId", userId))
					.collect()
			).length,
			feeds: (
				await ctx.db
					.query("calendarFeeds")
					.withIndex("by_user", (q) => q.eq("userId", userId))
					.collect()
			).length,
			devices: (
				await ctx.db
					.query("pushDevices")
					.withIndex("by_user", (q) => q.eq("userId", userId))
					.collect()
			).length,
			jobs,
			deliveries: deliveries.flat(),
		};
	},
});
export const pendingDelivery = internalMutation({
	args: { jobId: v.id("pushJobs"), userId: v.id("users") },
	handler: async (ctx, { jobId, userId }): Promise<Id<"pushDeliveries">> => {
		requireLocal();
		const user = await ctx.db.get(userId);
		if (!user?.email?.endsWith("@example.test"))
			throw new Error("Use fictional accounts.");
		const device = await ctx.db
			.query("pushDevices")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (!device) throw new Error("Register a test device.");
		return ctx.db.insert("pushDeliveries", {
			jobId,
			deviceId: device._id,
			token: device.token,
			state: "pending",
			attempt: 0,
			updatedAt: Date.now(),
		});
	},
});
export const resetMailCooldown = internalMutation({
	args: { email: v.string() },
	handler: async (ctx, { email }): Promise<void> => {
		requireLocal();
		if (!email.endsWith("@example.test"))
			throw new Error("Use fictional accounts.");
		for (const row of await ctx.db
			.query("mailLimits")
			.withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
			.collect())
			await ctx.db.delete(row._id);
	},
});

export const emailRecords = internalQuery({
	args: { email: v.string() },
	handler: async (ctx, { email }): Promise<number> => {
		requireLocal();
		if (!email.endsWith("@example.test"))
			throw new Error("Use fictional accounts.");
		const mail = await ctx.db
			.query("mailLimits")
			.withIndex("by_email", (q) => q.eq("email", email))
			.collect();
		const codes = await ctx.db
			.query("localEmails")
			.withIndex("by_email", (q) => q.eq("email", email))
			.collect();
		const limits = await ctx.db
			.query("authRateLimits")
			.withIndex("identifier", (q) => q.eq("identifier", email))
			.collect();
		return mail.length + codes.length + limits.length;
	},
});

export const seedMessageHistory = internalMutation({
	args: {
		clubId: v.id("clubs"),
		userId: v.id("users"),
		threadId: v.string(),
		count: v.number(),
		prefix: v.string(),
	},
	handler: async (
		ctx,
		{ clubId, userId, threadId, count, prefix },
	): Promise<void> => {
		requireLocal();
		const user = await ctx.db.get(userId);
		const thread = await ctx.db
			.query("conversations")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", threadId),
			)
			.unique();
		if (
			!user?.email?.endsWith("@example.test") ||
			!thread?.value.accountIds.includes(userId) ||
			!Number.isInteger(count) ||
			count < 1 ||
			count > 1000
		)
			throw new Error("Use a bounded fictional message history.");
		for (const index of Array.from({ length: count }, (_, index) => index))
			await ctx.db.insert("messages", {
				clubId,
				value: {
					id: `${prefix}-${index}`,
					threadId,
					accountId: userId,
					author: user.name ?? "Test member",
					body: `History ${index}`,
					time: "12:00 PM",
				},
			});
	},
});

export const removeDirectKey = internalMutation({
	args: { clubId: v.id("clubs"), userId: v.id("users"), threadId: v.string() },
	handler: async (ctx, { clubId, userId, threadId }): Promise<void> => {
		requireLocal();
		const user = await ctx.db.get(userId);
		const thread = await ctx.db
			.query("conversations")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", threadId),
			)
			.unique();
		if (
			!user?.email?.endsWith("@example.test") ||
			!thread?.value.accountIds.includes(userId) ||
			!thread.directKey
		)
			throw new Error("Use a fictional direct conversation.");
		await ctx.db.patch(thread._id, { directKey: undefined });
	},
});

export const seedClubHistory = internalMutation({
	args: { clubId: v.id("clubs"), userId: v.id("users") },
	handler: async (ctx, { clubId, userId }): Promise<void> => {
		requireLocal();
		const user = await ctx.db.get(userId);
		const club = await ctx.db.get(clubId);
		if (!user?.email?.endsWith("@example.test") || club?.ownerId !== userId)
			throw new Error("Use a fictional owned club.");
		const template = await ctx.db
			.query("events")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.first();
		const member = await ctx.db
			.query("members")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.first();
		const equipment = await ctx.db
			.query("equipment")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.first();
		if (!template || !member || !equipment)
			throw new Error("Create sample data first.");
		await ctx.db.patch(clubId, {
			seasons: [
				{
					id: "archive",
					name: "Archive",
					start: "2024-01-01",
					end: "2025-12-31",
				},
				...(club.seasons ?? [
					{
						id: "2026-2027",
						name: "2026–2027",
						start: "2026-09-01",
						end: "2027-08-31",
					},
				]),
			],
		});
		for (const index of Array.from({ length: 400 }, (_, i) => i)) {
			const id = `archive-${index}`;
			const date = new Date(Date.UTC(2024, 0, index + 1))
				.toISOString()
				.slice(0, 10);
			await ctx.db.insert("events", {
				clubId,
				value: {
					...template.value,
					id,
					date,
					seasonId: "archive",
					seriesId: undefined,
					kind: "training",
					eligiblePersonIds: undefined,
					cancelled: false,
				},
			});
			for (const personId of ["alex", "sam", "mila", "jamie", "casey"])
				await ctx.db.insert("responses", {
					clubId,
					value: {
						id: `${id}:${personId}`,
						eventId: id,
						personId,
						response: "going",
						attendance:
							index % 4 === 0 ? "absent" : index % 4 === 1 ? "late" : "present",
					},
				});
			await ctx.db.insert("feedback", {
				clubId,
				value: {
					id: `feedback-${index}`,
					personId: "sam",
					authorId: userId,
					body: `Coaching record ${index}`,
					date,
					visibility: index % 2 === 0 ? "published" : "private",
				},
			});
			if (index < 120) {
				await ctx.db.insert("members", {
					clubId,
					value: {
						...member.value,
						id: `fixture-${index}`,
						name: `Fixture Member ${String(index).padStart(3, "0")}`,
					},
				});
				await ctx.db.insert("payments", {
					clubId,
					value: {
						id: `history-payment-${index}`,
						personId: "jamie",
						amount: 1,
						note: `Payment ${index}`,
					},
				});
				await ctx.db.insert("loans", {
					clubId,
					value: {
						id: `history-return-${index}`,
						itemId: equipment.value.id,
						personId: "jamie",
						due: date,
						returned: true,
					},
				});
				await ctx.db.insert("notices", {
					clubId,
					value: {
						id: `history-notice-${index}`,
						title: `Notice ${index}`,
						body: "Club update",
						program: "all",
						date,
						acknowledgedBy: [],
					},
				});
				await ctx.db.insert("chatReports", {
					clubId,
					reporterId: userId,
					threadId: "club",
					messageId: `old-${index}`,
					author: "Fictional sender",
					body: "Old report",
					imageIds: [],
					reason: "Test report",
					state: "dismissed",
				});
			}
		}
		const charge = await ctx.db
			.query("charges")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", "jamie"),
			)
			.unique();
		if (charge) {
			const payments = await ctx.db
				.query("payments")
				.withIndex("by_person", (q) =>
					q.eq("clubId", clubId).eq("value.personId", "jamie"),
				)
				.collect();
			await ctx.db.patch(charge._id, {
				paidTotal: payments.reduce((sum, row) => sum + row.value.amount, 0),
			});
		} else
			await ctx.db.insert("charges", {
				clubId,
				value: { id: "jamie", personId: "jamie", amount: 50000 },
				paidTotal: 120,
			});
	},
});
