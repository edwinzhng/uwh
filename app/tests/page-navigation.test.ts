import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageTitle } from "../src/design-system/page-title.web";
import { sectionNavigationPresentation } from "../src/design-system/section-navigation-model";
import {
	isAccountDestination,
	isPrimaryDestination,
	pageContentKey,
} from "../src/domain/page-navigation";

test("filters and tabs preserve the page frame, while entity changes reset readiness", () => {
	const schedule = pageContentKey("schedule", {});
	expect(
		pageContentKey("schedule", {
			weekday: "4",
			program: "thursday-practice",
			search: "pool",
		}),
	).toBe(schedule);
	expect(pageContentKey("members", { sort: "name", program: "all" })).toBe(
		pageContentKey("members", {}),
	);
	expect(pageContentKey("session", { event: "one", part: "hockey" })).toBe(
		pageContentKey("session", { event: "one", part: "training" }),
	);
	expect(pageContentKey("session", { event: "two" })).not.toBe(
		pageContentKey("session", { event: "one" }),
	);
	expect(pageContentKey("account", { id: "one", tab: "feedback" })).toBe(
		pageContentKey("account", { id: "one", tab: "attendance" }),
	);
	expect(pageContentKey("account", { id: "two" })).not.toBe(
		pageContentKey("account", { id: "one" }),
	);
});

test("the avatar retains account selection without changing the viewed household profile", (): void => {
	for (const pathname of [
		"/account",
		"/account-settings",
		"/membership",
		"/my-progress",
	])
		expect(isAccountDestination(pathname)).toBe(true);
	for (const pathname of ["/member", "/members", "/club", "/schedule"])
		expect(isAccountDestination(pathname)).toBe(false);
});

test("only the five root destinations suppress their redundant mobile title", (): void => {
	for (const pathname of ["/", "/schedule", "/messages", "/account", "/club"])
		expect(isPrimaryDestination(pathname)).toBe(true);
	for (const pathname of [
		"/account-settings",
		"/member",
		"/conversation",
		"/session",
		"/programs",
		"/resources",
		"/club-information",
		"/design-system",
		"/schedule/details",
	])
		expect(isPrimaryDestination(pathname)).toBe(false);
});

test("compact section navigation uses one combined tab row", (): void => {
	for (const width of [320, 390, 480, 844, 899])
		expect(sectionNavigationPresentation(width)).toBe("compact-tabs");
	for (const width of [900, 1024, 1440])
		expect(sectionNavigationPresentation(width)).toBe("tabs");
});

test("a visually suppressed root title remains an accessible first-level heading", (): void => {
	const markup = renderToStaticMarkup(
		createElement(PageTitle, { title: "Schedule" }),
	);
	expect(markup).toMatch(/<h1[^>]*>Schedule<\/h1>/);
	expect(markup).toContain("clip-path:inset(50%)");
	expect(markup).not.toContain("aria-hidden");
	expect(markup).not.toContain("display:none");
});
