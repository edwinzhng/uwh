import { expect, test } from "bun:test";
import { chatAttachmentMime } from "../src/domain/chat-attachment";

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
test("chat files accept supported documents with matching signatures and declared types", (): void => {
	expect(
		chatAttachmentMime(
			bytes("%PDF-1.7\n"),
			"application/pdf",
			"plan.pdf",
			true,
		),
	).toBe("application/pdf");
	expect(
		chatAttachmentMime(
			bytes("Practice notes"),
			"text/plain",
			"notes.txt",
			true,
		),
	).toBe("text/plain");
	expect(
		chatAttachmentMime(
			bytes("%PDF-1.7\n"),
			"application/pdf",
			"plan.pdf",
			false,
		),
	).toBeUndefined();
});
test("chat files reject active markup and MIME mismatches", (): void => {
	expect(
		chatAttachmentMime(
			bytes("<html><script>alert(1)</script>"),
			"text/plain",
			"notes.txt",
			true,
		),
	).toBeUndefined();
	expect(
		chatAttachmentMime(bytes("%PDF-1.7\n"), "image/png", "photo.png", true),
	).toBeUndefined();
});
