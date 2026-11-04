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
	expect(calendarViewTitle("subscribe")).toBe("Automatic updates");
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

test("calendar scope survives step remounts and busy work blocks dismissal", async (): Promise<void> => {
	const source = await Bun.file(
		new URL("../src/features/calendar-export-button.tsx", import.meta.url),
	).text();
	expect(source).toContain(
		"const [selected, setSelected] = useState(people.map((person) => person.id))",
	);
	expect(source).toContain("focusKey={view}");
	expect(source).toContain("isDismissDisabled={busy}");
	expect(source).toContain("setView(calendarViewAfterScopeChange(view))");
	expect(source).not.toContain("open ? <CalendarSettings");
});

test("provider actions reuse prepared URLs without waiting for a network action before browser activation", async (): Promise<void> => {
	const choice = await Bun.file(
		new URL(
			"../src/features/calendar-subscription-choice.tsx",
			import.meta.url,
		),
	).text();
	const source = await Bun.file(
		new URL("../src/features/calendar-subscriptions.tsx", import.meta.url),
	).text();
	expect(choice).toContain("includeWaitlisted: false");
	expect(choice).toContain("onPrepared()");
	expect(choice).not.toContain("rotate:");
	expect(source).not.toContain("useAction");
	expect(source).toContain("googleCalendarSubscriptionUrl(url)");
	expect(source).toContain("Clipboard.setStringAsync(url)");
	expect(source).toContain('intent="confirmation"');
	expect(source).toContain("await disable({ personId })");
	expect(source).toContain("Keep it private");
	expect(source).toContain('label="Create subscription link"');
	expect(source).toContain("onPress={onCreateLink}");
});

test("Apple receives the same private feed as a subscription instead of a file import", (): void => {
	const feed = calendarFeedUrl("https://club.convex.site", "private+token/&?=");
	const apple = new URL(appleCalendarSubscriptionUrl(feed));
	expect(apple.protocol).toBe("webcal:");
	expect(apple.host).toBe(new URL(feed).host);
	expect(apple.searchParams.get("token")).toBe("private+token/&?=");
});
