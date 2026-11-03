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
	test("clickable rows retain an eight-pixel gutter even when their read-only layout is flush", (): void => {
		for (const flush of [false, true]) {
			const spacing = listRowSpacing({ interactive: true, flush });
			expect(spacing.marginHorizontal).toBe(space.xs);
			expect(spacing.paddingHorizontal).toBe(space.sm);
			expect(spacing.paddingVertical).toBe(space.xs);
		}
		expect(interactiveRow.minHeight).toBeGreaterThanOrEqual(44);
	});

	test("card-row hover highlights stop eight pixels before the card edge rather than bleeding across it", (): void => {
		const spacing = listRowSpacing({ interactive: true, cardRow: true });
		expect(space.md + spacing.marginHorizontal).toBe(space.xs);
		expect(interactiveRow.borderRadius).toBeGreaterThan(0);
		expect(interactiveRow.focusOffset).toBe(-geometry.focus);
	});

	test("read-only content preserves its existing compact and flush alignment", (): void => {
		expect(listRowSpacing({ interactive: false, flush: true })).toEqual({
			paddingHorizontal: 0,
			paddingVertical: space.xxs,
			marginHorizontal: 0,
		});
		expect(
			listRowSpacing({ interactive: false, cardRow: true, hasLeading: true }),
		).toEqual({
			paddingHorizontal: space.md,
			paddingVertical: space.xs,
			marginHorizontal: -space.md,
		});
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
