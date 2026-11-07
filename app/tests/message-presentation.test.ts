import { describe, expect, test } from "bun:test";
import {
	chatTimeLabel,
	messageClusterWindowMs,
	messagePresentations,
} from "../src/domain/message-presentation";

test("chat dates distinguish older activity using the club timezone", (): void => {
	const now = Date.parse("2026-11-03T01:00:00Z");
	expect(
		chatTimeLabel(Date.parse("2026-11-02T18:30:00Z"), "America/Edmonton", now),
	).toMatch(/^\d{1,2}:30 [AP]M$/);
	expect(
		chatTimeLabel(Date.parse("2026-11-02T05:30:00Z"), "America/Edmonton", now),
	).toBe("Nov 1");
	expect(chatTimeLabel(Number.NaN, "America/Edmonton", now)).toBe("");
});

const context = {
	accountId: "self",
	showAuthors: true,
	hasOlderMessages: false,
};
const message = (
	id: string,
	accountId: string,
	createdAt: number,
	time = "9:10 AM",
): { id: string; accountId: string; createdAt: number; time: string } => ({
	id,
	accountId,
	createdAt,
	time,
});

describe("message cluster presentation", () => {
	test("uses original message timestamps when imported records share an insertion time", (): void => {
		const result = messagePresentations(
			[
				message("later", "peer", 2, "2026-11-02T19:12:00Z"),
				message("earlier", "peer", 1, "2026-11-02T14:26:00Z"),
			],
			{ ...context, timeZone: "UTC" },
		);
		expect(result.get("later")?.timeLabel).toMatch(/Nov 2.*7:12 PM/);
	});
	test("same-author messages share a cluster through the inclusive five-minute boundary", (): void => {
		const items = [
			message("latest", "peer", messageClusterWindowMs),
			message("first", "peer", 0),
		];
		const result = messagePresentations(items, context);
		expect(result.get("first")).toEqual({
			showAuthor: true,
			timeLabel: "9:10 AM",
		});
		expect(result.get("latest")).toEqual({
			showAuthor: false,
			timeLabel: undefined,
		});
	});

	test("author identity changes show the new incoming sender without repeating a nearby timestamp", (): void => {
		const result = messagePresentations(
			[
				message("own", "self", 3),
				message("second", "different-id", 2),
				message("first", "peer", 1),
			],
			context,
		);
		expect(result.get("second")).toEqual({
			showAuthor: true,
			timeLabel: undefined,
		});
		expect(result.get("own")).toEqual({
			showAuthor: false,
			timeLabel: undefined,
		});
	});

	test("a longer real timestamp gap starts a new cluster and uses the existing display time", (): void => {
		const result = messagePresentations(
			[
				message("later", "peer", messageClusterWindowMs + 1, "9:16 AM"),
				message("earlier", "peer", 0),
			],
			context,
		);
		expect(result.get("later")).toEqual({
			showAuthor: true,
			timeLabel: "9:16 AM",
		});
	});

	test("an unloaded older page keeps sender context without inventing a time boundary", (): void => {
		const latest = message("latest", "peer", 2);
		const boundary = messagePresentations([latest], {
			...context,
			hasOlderMessages: true,
		});
		expect(boundary.get("latest")).toEqual({
			showAuthor: true,
			timeLabel: undefined,
		});
		const expanded = messagePresentations(
			[latest, message("older", "peer", 1)],
			context,
		);
		expect(expanded.get("latest")).toEqual({
			showAuthor: false,
			timeLabel: undefined,
		});
	});

	test("invalid or out-of-order timestamps never falsely merge bubbles", (): void => {
		for (const time of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
			const result = messagePresentations(
				[message("latest", "peer", time), message("older", "peer", 0)],
				context,
			);
			expect(result.get("latest")).toEqual({
				showAuthor: true,
				timeLabel: "9:10 AM",
			});
		}
	});

	test("direct conversations omit sender labels and missing display times stay absent", (): void => {
		const result = messagePresentations([message("first", "peer", 0, "")], {
			...context,
			showAuthors: false,
		});
		expect(result.get("first")).toEqual({
			showAuthor: false,
			timeLabel: undefined,
		});
		expect(messagePresentations([], context).size).toBe(0);
	});
});
