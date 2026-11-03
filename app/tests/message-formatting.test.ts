import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
	formatMessageDraft,
	formattedText,
	formattedTextPreview,
} from "../src/design-system/formatted-text-model";
import { contentFingerprint } from "../src/domain/content-fingerprint";

describe("message formatting", () => {
	test("compact previews remove formatting markers while preserving literal text and list structure", (): void => {
		expect(
			formattedTextPreview("**Practice** with *support*\n• Bring fins"),
		).toBe("Practice with support • Bring fins");
		expect(formattedTextPreview("unfinished **bold <script>no</script>")).toBe(
			"unfinished **bold <script>no</script>",
		);
	});
	test("preserves plain text and renders inline styles without HTML", () => {
		const line = formattedText(
			"Warm **passing** then *support* <script>no</script>",
		).at(0);
		expect(line?.runs.map((run) => run.text).join("")).toBe(
			"Warm passing then support <script>no</script>",
		);
		expect(line?.runs.find((run) => run.text === "passing")?.bold).toBe(true);
		expect(line?.runs.find((run) => run.text === "support")?.italic).toBe(true);
		expect(
			formattedText("unfinished **bold")
				.at(0)
				?.runs.map((run) => run.text)
				.join(""),
		).toBe("unfinished **bold");
	});
	test("keeps list lines and blank lines stable", () => {
		const result = formattedText("- First\n2. Second\n\n• Third");
		expect(result.map((line) => line.prefix)).toEqual(["• ", "2. ", "", "• "]);
		expect(result.at(2)?.runs.at(0)?.text).toBe(" ");
	});
	test("formats the selected range and leaves the cursor inside empty markers", () => {
		expect(
			formatMessageDraft("Pass now", { start: 0, end: 4 }, "bold"),
		).toEqual({ body: "**Pass** now", selection: { start: 2, end: 6 } });
		expect(formatMessageDraft("", { start: 500, end: 600 }, "italic")).toEqual({
			body: "*italic text*",
			selection: { start: 1, end: 12 },
		});
	});
	test("lists whole selected lines without touching the following line", () => {
		expect(
			formatMessageDraft("one\ntwo\nthree", { start: 0, end: 8 }, "numbered")
				.body,
		).toBe("1. one\n2. two\nthree");
		expect(
			formatMessageDraft("\nnext", { start: 0, end: 0 }, "bullet").body,
		).toBe("• List item\nnext");
		expect(
			formatMessageDraft("- one\n2. two", { start: 0, end: 12 }, "bullet").body,
		).toBe("• one\n• two");
	});
	test("shared content fingerprints preserve exact Unicode input", () => {
		expect(contentFingerprint("Unicode practice 🏊")).toBe(
			createHash("sha256").update("Unicode practice 🏊").digest("hex"),
		);
	});
});
