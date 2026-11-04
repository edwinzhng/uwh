import { expect, test } from "bun:test";
import { calendarFeedUrl } from "../src/domain/calendar-links";
import {
	appleCalendarSubscriptionUrl,
	calendarScopeLabel,
	calendarViewAfterScopeChange,
	calendarViewTitle,
	googleCalendarSubscriptionUrl,
} from "../src/domain/calendar-workflow";

test("changing subscription scope returns to an explicit preparation choice", (): void => {
	expect(calendarViewAfterScopeChange("subscribe")).toBe("choose");
	expect(calendarViewAfterScopeChange("download")).toBe("download");
	expect(calendarViewAfterScopeChange("choose")).toBe("choose");
});

test("calendar steps identify one task instead of repeating an export form", (): void => {
	expect(calendarViewTitle("choose")).toBe("Add to calendar");
	expect(calendarViewTitle("subscribe")).toBe("Calendar sync");
	expect(calendarViewTitle("download")).toBe("Download calendar");
});

test("calendar scope names the selected people without silently switching household identity", (): void => {
	expect(calendarScopeLabel([])).toBe("Choose at least one person");
	expect(calendarScopeLabel([{ name: "Edwin" }])).toBe("Edwin");
	expect(calendarScopeLabel([{ name: "Edwin" }, { name: "Sam" }])).toBe(
		"Edwin, Sam",
	);
});

test("Google receives the complete private feed URL as a single parameter", (): void => {
	const feed = calendarFeedUrl("https://club.convex.site", "private+token/&?=");
	const subscription = new URL(googleCalendarSubscriptionUrl(feed));
	expect(subscription.origin).toBe("https://calendar.google.com");
	expect(subscription.searchParams.get("cid")).toBe(feed);
	expect([...subscription.searchParams.keys()]).toEqual(["cid"]);
	expect(new URL(feed).searchParams.get("token")).toBe("private+token/&?=");
});

test("Apple receives the same private feed as a subscription instead of a file import", (): void => {
	const feed = calendarFeedUrl("https://club.convex.site", "private+token/&?=");
	const apple = new URL(appleCalendarSubscriptionUrl(feed));
	expect(apple.protocol).toBe("webcal:");
	expect(apple.host).toBe(new URL(feed).host);
	expect(apple.searchParams.get("token")).toBe("private+token/&?=");
});
