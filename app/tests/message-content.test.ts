import { describe, expect, test } from "bun:test";
import { primaryAccount } from "../src/demo/app-data";
import {
	formatRichMessage,
	initialRichEditor,
	replaceRichText,
	serializeRichMessage,
} from "../src/design-system/rich-message-model";
import type { AppData } from "../src/domain/app-types";
import { hasVisibleMessageContent } from "../src/domain/message-content";
import { reduceMessages } from "../src/domain/message-reducer";

const blankBodies = [
	"",
	" \t\r\n",
	"** **",
	"* *",
	"*** \t ***",
	"-  ",
	"• \t",
	"1.  ",
	"22. \t",
	" \t- ** **\n42. * *\n   ",
	"**\u00A0**",
];
const visibleBodies = [
	"0",
	"1.",
	"1. 0",
	"-",
	"*",
	"**",
	"***",
	"unfinished **bold",
	"**Practice**",
	"- *Bring fins*",
	"1. **First**\n2. Next",
	"👨‍👩‍👧‍👦",
	String.raw`\*`,
	String.raw`\* \*`,
	String.raw`\** \**`,
	String.raw`\-  `,
	String.raw`1\.  `,
];
const messageData = {
	conversations: [
		{
			id: "content-tests",
			title: "Content tests",
			subtitle: "Group",
			kind: "group",
			accountIds: [primaryAccount.id],
		},
	],
	messages: [],
} satisfies Pick<AppData, "conversations" | "messages">;
const send = (
	body: string,
): Extract<Parameters<typeof reduceMessages>[2], { type: "send-message" }> =>
	({
		type: "send-message",
		id: "content-message",
		threadId: "content-tests",
		body,
		time: "Now",
	}) satisfies Parameters<typeof reduceMessages>[2];

describe("visible message content", () => {
	test("formatting and list markers alone do not count as message content", (): void => {
		for (const body of blankBodies)
			expect(hasVisibleMessageContent(body)).toBe(false);
	});

	test("actual text, emoji, escaped punctuation and unfinished literal markers remain valid", (): void => {
		for (const body of visibleBodies)
			expect(hasVisibleMessageContent(body)).toBe(true);
	});

	test("real editor formatting of whitespace stays unsendable without erasing literal input", (): void => {
		for (const format of ["bold", "italic", "bullet", "numbered"] as const) {
			const whitespace = replaceRichText(
				formatRichMessage(initialRichEditor(""), format),
				" ",
			);
			expect(
				hasVisibleMessageContent(serializeRichMessage(whitespace.document)),
			).toBe(false);
		}
		for (const literal of ["* *", "-  ", "1.  "]) {
			const editor = replaceRichText(initialRichEditor(""), literal);
			expect(
				hasVisibleMessageContent(serializeRichMessage(editor.document)),
			).toBe(true);
		}
	});

	test("authoritative sends and edits reject invisible formatting without changing history", (): void => {
		const existing = reduceMessages(
			messageData,
			primaryAccount,
			send("Practice"),
		);
		for (const body of blankBodies) {
			expect(() =>
				reduceMessages(messageData, primaryAccount, send(body)),
			).toThrow("Add a message or photo.");
			expect(() =>
				reduceMessages(existing, primaryAccount, {
					type: "edit-message",
					messageId: "content-message",
					body,
				}),
			).toThrow("Add a message under 5,000 characters.");
		}
		expect(messageData.messages).toEqual([]);
		expect(existing.messages.at(-1)?.body).toBe("Practice");
	});

	test("photo-only sends and edits remain valid with empty or formatting-only captions", (): void => {
		const images = [{ id: "content-photo", name: "Practice.png" }];
		for (const body of blankBodies) {
			const posted = reduceMessages(messageData, primaryAccount, {
				...send(body),
				images,
			});
			expect(posted.messages.at(-1)?.images).toEqual(images);
			const edited = reduceMessages(posted, primaryAccount, {
				type: "edit-message",
				messageId: "content-message",
				body: "* *",
			});
			expect(edited.messages.at(-1)?.images).toEqual(images);
		}
	});

	test("send and edit preserve legitimate literal punctuation and visible formatting", (): void => {
		for (const body of visibleBodies) {
			const posted = reduceMessages(messageData, primaryAccount, send(body));
			expect(posted.messages.at(-1)?.body).toBe(body.trim());
			const edited = reduceMessages(posted, primaryAccount, {
				type: "edit-message",
				messageId: "content-message",
				body: `${body}\n**More**`,
			});
			expect(edited.messages.at(-1)?.body).toBe(`${body}\n**More**`.trim());
		}
	});
});
