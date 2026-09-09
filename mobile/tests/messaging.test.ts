import { describe, expect, test } from "bun:test";
import {
	initialAppData,
	previewAccounts,
	primaryAccount,
} from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { AppAction } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import {
	directThreadId,
	directThreadKey,
	imageMime,
	isDirectThread,
	isReactionEmoji,
	messagePreview,
} from "../src/domain/messaging";

const adminOnly = previewAccounts.find((account) => account.id === "morgan");
if (!adminOnly) throw new Error("Missing test account.");

describe("message reactions and photos", () => {
	test("direct conversations reuse the same pair in either direction without matching group threads", (): void => {
		const first = primaryAccount.id;
		const second = adminOnly.id;
		expect(directThreadKey(first, second)).toBe(directThreadKey(second, first));
		expect(directThreadId(first, second)).toBe(directThreadId(second, first));
		const created = reduceApp(initialAppData, primaryAccount, {
			type: "create-thread",
			id: "existing-dm",
			recipientId: second,
			title: adminOnly.name,
		});
		const reopened = reduceApp(created, adminOnly, {
			type: "create-thread",
			id: "duplicate-dm",
			recipientId: first,
			title: primaryAccount.name,
		});
		expect(reopened.conversations).toEqual(created.conversations);
		const thread = created.conversations.find(
			(entry) => entry.id === "existing-dm",
		);
		if (!thread) throw new Error("Direct conversation missing.");
		expect(isDirectThread(thread, second, first)).toBe(true);
		for (const id of ["club", "youth"])
			expect(isDirectThread({ ...thread, id }, first, second)).toBe(false);
		expect(
			isDirectThread(
				{ ...thread, accountIds: [first, second, "third"] },
				first,
				second,
			),
		).toBe(false);
		expect(() =>
			reduceApp(created, primaryAccount, {
				type: "create-thread",
				id: "self",
				recipientId: first,
				title: "Me",
			}),
		).toThrow();
	});
	test("all emoji sequences work while text and multiple emojis are rejected", (): void => {
		for (const emoji of [
			"❤️",
			"🐊",
			"🧑🏽‍🚀",
			"🇨🇦",
			"🏳️‍🌈",
			"1️⃣",
			"🫶🏿",
			"👨‍👩‍👧‍👦",
		])
			expect(isReactionEmoji(emoji)).toBe(true);
		for (const text of ["", "hello", "👍👍", "x👍", "👍 x"])
			expect(isReactionEmoji(text)).toBe(false);
	});
	test("replies remain scoped to their thread and messages are editable only by their sender", (): void => {
		const posted = reduceApp(initialAppData, primaryAccount, {
			type: "send-message",
			id: "original",
			threadId: "club",
			body: "Bring a cap",
			time: "Now",
			images: [{ id: "attachment", name: "Kit.png" }],
		});
		const reply = reduceApp(posted, adminOnly, {
			type: "send-message",
			id: "reply",
			threadId: "club",
			body: "Got it",
			time: "Now",
			replyToId: "original",
		});
		expect(reply.messages.at(-1)?.replyToId).toBe("original");
		expect(() =>
			reduceApp(reply, primaryAccount, {
				type: "send-message",
				id: "cross-thread",
				threadId: "casey",
				body: "Reply",
				time: "Now",
				replyToId: "original",
			}),
		).toThrow();
		for (const type of ["edit-message", "delete-message"] as const)
			expect(() =>
				reduceApp(reply, adminOnly, {
					type,
					messageId: "original",
					body: "Changed",
				}),
			).toThrow();
		const edited = reduceApp(reply, primaryAccount, {
			type: "edit-message",
			messageId: "original",
			body: "Bring two caps",
		});
		expect(
			edited.messages.find((entry) => entry.id === "original"),
		).toMatchObject({
			body: "Bring two caps",
			edited: true,
			images: [{ id: "attachment", name: "Kit.png" }],
		});
		const deleted = reduceApp(edited, primaryAccount, {
			type: "delete-message",
			messageId: "original",
		});
		const original = deleted.messages.find((entry) => entry.id === "original");
		expect(original).toMatchObject({ body: "", deleted: true });
		expect(original?.images).toBeUndefined();
		expect(original && messagePreview(original)).toBe("Message deleted");
		expect(
			deleted.messages.find((entry) => entry.id === "reply")?.replyToId,
		).toBe("original");
		expect(() =>
			reduceApp(deleted, primaryAccount, {
				type: "edit-message",
				messageId: "original",
				body: "Restore",
			}),
		).toThrow();
		expect(() =>
			reduceApp(deleted, adminOnly, {
				type: "set-reaction",
				messageId: "original",
				emoji: "👍",
				active: true,
			}),
		).toThrow();
	});
	test("reactions use the account, are retry safe, and remove only that account", () => {
		const add: AppAction = {
			type: "set-reaction",
			messageId: "m1",
			emoji: "👍",
			active: true,
		};
		const once = reduceApp(initialAppData, primaryAccount, add);
		const retried = reduceApp(once, primaryAccount, add);
		expect(
			retried.messages.find((message) => message.id === "m1")?.reactions,
		).toEqual([{ emoji: "👍", accountIds: [primaryAccount.id] }]);
		const shared = reduceApp(retried, adminOnly, add);
		const removed = reduceApp(shared, primaryAccount, {
			...add,
			active: false,
		});
		expect(
			removed.messages.find((message) => message.id === "m1")?.reactions,
		).toEqual([{ emoji: "👍", accountIds: [adminOnly.id] }]);
	});
	test("even administrators cannot react in unrelated private conversations", () => {
		const privateMessage = reduceApp(initialAppData, primaryAccount, {
			type: "send-message",
			id: "private",
			threadId: "casey",
			body: "Training photo",
			time: "Now",
		});
		expect(() =>
			reduceApp(privateMessage, adminOnly, {
				type: "set-reaction",
				messageId: "private",
				emoji: "👍",
				active: true,
			}),
		).toThrow();
		expect(() =>
			reduceApp(privateMessage, primaryAccount, {
				type: "set-reaction",
				messageId: "missing",
				emoji: "👍",
				active: true,
			}),
		).toThrow();
		expect(() =>
			reduceApp(privateMessage, primaryAccount, {
				type: "set-reaction",
				messageId: "m1",
				emoji: "unsupported",
				active: true,
			}),
		).toThrow();
	});
	test("photo-only messages retain their sender and visibility", () => {
		const action: AppAction = {
			type: "send-message",
			id: "photo",
			threadId: "casey",
			body: "",
			time: "Now",
			images: [{ id: "photo-id", name: "Practice.png" }],
		};
		const result = reduceApp(initialAppData, primaryAccount, action);
		expect(result.messages.at(-1)?.images).toEqual(action.images);
		expect(result.messages.at(-1)?.accountId).toBe(primaryAccount.id);
		expect(
			visibleAppData(result, adminOnly).messages.some(
				(message) => message.id === "photo",
			),
		).toBe(false);
		expect(reduceApp(result, primaryAccount, action).messages.length).toBe(
			result.messages.length,
		);
		expect(() =>
			reduceApp(initialAppData, primaryAccount, { ...action, images: [] }),
		).toThrow();
		expect(() =>
			reduceApp(initialAppData, primaryAccount, {
				...action,
				images: Array.from({ length: 4 }, (_, index) => ({
					id: String(index),
					name: "Photo",
				})),
			}),
		).toThrow();
		expect(() =>
			reduceApp(initialAppData, primaryAccount, {
				...action,
				images: [
					{ id: "same", name: "Photo" },
					{ id: "same", name: "Photo" },
				],
			}),
		).toThrow();
	});
	test("image formats come from bytes, never the filename", () => {
		expect(imageMime(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
			"image/png",
		);
		expect(imageMime(new Uint8Array([255, 216, 255, 224]))).toBe("image/jpeg");
		expect(
			imageMime(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])),
		).toBe("image/webp");
		expect(
			imageMime(new TextEncoder().encode('<svg onload="alert(1)"/>')),
		).toBeUndefined();
		expect(imageMime(new Uint8Array())).toBeUndefined();
	});
});
