import { expect, test } from "bun:test";
import {
	calendarFeedUrl,
	hostedCalendarOrigin,
} from "../src/domain/calendar-links";
import {
	appleCalendarSubscriptionUrl,
	googleCalendarSubscriptionUrl,
} from "../src/domain/calendar-workflow";

test("only the production backend uses the club calendar proxy", (): void => {
	expect(
		hostedCalendarOrigin("https://brainy-albatross-874.convex.site/"),
	).toBe("https://app.calgaryuwh.com");
	expect(hostedCalendarOrigin("https://preview.convex.site")).toBe(
		"https://preview.convex.site",
	);
	expect(hostedCalendarOrigin("http://127.0.0.1:3211")).toBe(
		"http://127.0.0.1:3211",
	);
});

test("Google receives the complete private feed URL as a single parameter", (): void => {
	const feed = calendarFeedUrl(
		"https://app.calgaryuwh.com",
		"private+token/&?=",
	);
	const subscription = new URL(googleCalendarSubscriptionUrl(feed));
	expect(subscription.origin).toBe("https://calendar.google.com");
	expect(subscription.searchParams.get("cid")).toBe(feed);
	expect([...subscription.searchParams.keys()]).toEqual(["cid"]);
	expect(new URL(feed).searchParams.get("token")).toBe("private+token/&?=");
});

test("Apple receives the same private feed as a subscription instead of a file import", (): void => {
	const feed = calendarFeedUrl(
		"https://app.calgaryuwh.com",
		"private+token/&?=",
	);
	const apple = new URL(appleCalendarSubscriptionUrl(feed));
	expect(apple.protocol).toBe("webcal:");
	expect(apple.host).toBe(new URL(feed).host);
	expect(apple.searchParams.get("token")).toBe("private+token/&?=");
});
