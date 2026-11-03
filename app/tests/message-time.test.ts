import { expect, test } from "bun:test";
import { pollMessageTime } from "../src/domain/chat-polls";
import { messageTimeLabel } from "../src/domain/message-presentation";

test("ISO poll anchors use the club-local display time in pinned and inbox metadata", (): void => {
	const time = "2026-10-26T05:30:00.000Z";
	for (const zone of ["America/Edmonton", "Pacific/Auckland", "UTC"]) {
		const label = messageTimeLabel({ time }, zone);
		expect(label).toBe(pollMessageTime(Date.parse(time), zone));
		expect(label).not.toContain("2026-");
	}
	expect(messageTimeLabel({ time: " 9:30 PM " })).toBe("9:30 PM");
	expect(messageTimeLabel({ time: "Now" })).toBe("Now");
	expect(messageTimeLabel({ time: "" })).toBe("");
});
