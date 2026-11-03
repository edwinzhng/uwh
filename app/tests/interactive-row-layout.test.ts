import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	interactiveRow,
	listRowSpacing,
} from "../src/design-system/interactive-row-layout";
import { PopupStyles } from "../src/design-system/popup-styles.web";
import { corners, geometry, space } from "../src/design-system/tokens";

describe("shared clickable row spacing", () => {
	test("interactive and read-only rows keep their content on the parent edge in every layout", (): void => {
		for (const interactive of [true, false])
			for (const flush of [true, false])
				for (const cardRow of [true, false]) {
					const spacing = listRowSpacing({ interactive, flush, cardRow });
					expect(spacing.marginHorizontal + spacing.paddingHorizontal).toBe(0);
					expect(space.md + spacing.marginHorizontal).toBeGreaterThanOrEqual(0);
				}
		expect(interactiveRow.minHeight).toBeGreaterThanOrEqual(44);
	});
	test("row hover adds clearance around aligned content without shifting its leading edge", (): void => {
		const spacing = listRowSpacing({ interactive: true });
		expect(spacing.paddingHorizontal).toBeGreaterThan(0);
		expect(spacing.marginHorizontal).toBe(-spacing.paddingHorizontal);
		expect(interactiveRow.focusOffset).toBe(-geometry.focus);
	});

	test("menus, select rows, person choices and autocomplete share centered, padded targets on every pointer type", (): void => {
		const styles = renderToStaticMarkup(createElement(PopupStyles));
		const popup = styles.match(/\.club-popup \{([^}]+)\}/)?.at(1);
		const row = styles.match(/\.club-popup-item \{([^}]+)\}/)?.at(1);
		expect(popup).toContain(`padding:${interactiveRow.gutter}px`);
		expect(popup).toContain(`border-radius:${corners.menu}px`);
		expect(corners.menu).toBe(
			interactiveRow.borderRadius + interactiveRow.gutter,
		);
		expect(row).toContain("display:flex; align-items:center");
		expect(row).toContain(`min-height:${interactiveRow.minHeight}px`);
		expect(row).toContain(
			`padding:${interactiveRow.paddingVertical}px ${interactiveRow.paddingHorizontal}px`,
		);
		expect(styles).toContain(
			`.club-popup-item:focus-visible:not([data-disabled]) { outline:${geometry.focus}px`,
		);
		expect(styles).toContain(`outline-offset:${interactiveRow.focusOffset}px`);
		expect(styles).not.toMatch(/\.club-person-option \{[^}]*padding:/);
		expect(styles).toContain(
			`max-height:min(calc(var(--available-height) - ${(interactiveRow.gutter + geometry.border) * 2}px)`,
		);
	});
});
