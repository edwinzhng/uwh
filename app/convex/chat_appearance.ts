import { v } from "convex/values";
import {
	canEditChatAppearance,
	canRenameChat,
	isChatIcon,
	sameChatAppearance,
} from "../src/domain/chat-appearance";
import { mutation } from "./_generated/server";
import { accountFor, requireMember } from "./identity";
import { threadFor } from "./message_access";
import { requireChat } from "./moderation";

export const save = mutation({
	args: {
		threadId: v.string(),
		icon: v.optional(v.string()),
		imageId: v.optional(v.string()),
		expectedIcon: v.optional(v.string()),
		expectedImageId: v.optional(v.string()),
	},
	handler: async (ctx, input): Promise<void> => {
		const actor = await requireMember(ctx);
		const thread = await threadFor(ctx, actor.clubId, input.threadId);
		if (!thread || !canEditChatAppearance(thread.value, accountFor(actor)))
			throw new Error("You can’t change this chat’s picture.");
		await requireChat(ctx, actor, input.threadId);
		if (input.icon && (!isChatIcon(input.icon) || input.imageId))
			throw new Error("Choose a photo or a chat icon.");
		const next = {
			avatarIcon: input.icon && isChatIcon(input.icon) ? input.icon : undefined,
			avatarImageId: input.imageId,
		};
		if (sameChatAppearance(thread.value, next)) return;
		if (
			!sameChatAppearance(thread.value, {
				avatarIcon:
					input.expectedIcon && isChatIcon(input.expectedIcon)
						? input.expectedIcon
						: undefined,
				avatarImageId: input.expectedImageId,
			})
		)
			throw new Error(
				"The chat picture changed. Close and reopen this editor.",
			);
		const imageId = input.imageId
			? ctx.db.normalizeId("images", input.imageId)
			: undefined;
		const image = imageId ? await ctx.db.get(imageId) : undefined;
		if (
			input.imageId &&
			(!image ||
				image.clubId !== actor.clubId ||
				image.threadId !== input.threadId ||
				image.ownerId !== actor.userId ||
				image.messageId ||
				image.chatAvatar)
		)
			throw new Error("Choose this chat photo again.");
		if (image) await ctx.db.patch(image._id, { chatAvatar: true });
		await ctx.db.patch(thread._id, { value: { ...thread.value, ...next } });
		const previousId = thread.value.avatarImageId
			? ctx.db.normalizeId("images", thread.value.avatarImageId)
			: undefined;
		const previous = previousId ? await ctx.db.get(previousId) : undefined;
		if (
			previous?.chatAvatar &&
			previous.clubId === actor.clubId &&
			previous.threadId === input.threadId
		) {
			await ctx.storage.delete(previous.storageId);
			await ctx.db.delete(previous._id);
		}
	},
});

export const rename = mutation({
	args: { threadId: v.string(), title: v.string(), expectedTitle: v.string() },
	handler: async (ctx, input): Promise<void> => {
		const actor = await requireMember(ctx);
		const thread = await threadFor(ctx, actor.clubId, input.threadId);
		if (!thread || !canRenameChat(thread.value, accountFor(actor)))
			throw new Error("This chat’s name can’t be changed.");
		await requireChat(ctx, actor, input.threadId);
		const title = input.title.trim();
		if (!title || title.length > 80) throw new Error("Use 1–80 characters.");
		if (thread.value.title === title) return;
		if (thread.value.title !== input.expectedTitle)
			throw new Error("The chat name changed. Reopen this editor.");
		await ctx.db.patch(thread._id, { value: { ...thread.value, title } });
	},
});
