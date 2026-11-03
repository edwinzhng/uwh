import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarDay } from "../src/design-system/calendar-day.web";

test("calendar day selection exposes weekday, current date and event count to assistive technology", (): void => {
	const markup = renderToStaticMarkup(
		createElement(CalendarDay, {
			value: "2026-11-02",
			weekday: "Mon",
			label: "Monday, November 2, today, 2 events",
			selected: true,
			today: true,
			muted: false,
			count: 2,
			focusOnSelection: false,
			onPress: (): void => {},
			onNavigate: (): boolean => false,
		}),
	);
	expect(markup).toContain("Mon");
	expect(markup).toContain('aria-current="date"');
	expect(markup).toContain('aria-pressed="true"');
	expect(markup).toContain('aria-label="Monday, November 2, today, 2 events"');
	expect(markup).toContain('tabindex="0"');
});
