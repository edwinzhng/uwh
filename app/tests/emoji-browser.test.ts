import { expect, test } from "bun:test";
import {
	emojiBrowserMetrics,
	emojiColumns,
	emojiResults,
	emojiVariant,
} from "../src/design-system/emoji-browser-model";
import { emojiData } from "../src/design-system/emoji-data";
import { geometry, space } from "../src/design-system/tokens";

test("emoji grid preserves native touch targets at phone widths", (): void => {
	expect(emojiColumns(288)).toBe(6);
	expect(emojiColumns(358)).toBe(7);
	expect(emojiColumns(640)).toBe(7);
	expect(emojiColumns(0)).toBe(1);
	for (const width of [288, 320, 358, 400])
		expect(width / emojiColumns(width)).toBeGreaterThanOrEqual(44);
});

test("emoji row and anchored category chrome reserve the entire glyph line box", (): void => {
	expect(emojiBrowserMetrics.rowHeight).toBeGreaterThanOrEqual(geometry.touch);
	expect(emojiBrowserMetrics.rowHeight).toBe(
		emojiBrowserMetrics.glyphLineHeight + space.xxs * 2,
	);
	expect(emojiBrowserMetrics.categoryHeight).toBe(
		emojiBrowserMetrics.rowHeight + space.xs + geometry.border,
	);
	for (const width of [288, 320, 358, 640]) {
		const columns = emojiColumns(width);
		expect(columns * geometry.touch).toBeLessThanOrEqual(width);
		expect(emojiBrowserMetrics.rowHeight).toBeGreaterThanOrEqual(
			emojiBrowserMetrics.glyphLineHeight,
		);
	}
});

test("only the emoji grid scrolls vertically and shortcuts cannot consume reserved category space", async (): Promise<void> => {
	const browser = await Bun.file(
		new URL("../src/design-system/emoji-browser.tsx", import.meta.url),
	).text();
	const shortcuts = await Bun.file(
		new URL("../src/design-system/reaction-content.tsx", import.meta.url),
	).text();
	expect(browser).toContain("ListHeaderComponent={header}");
	expect(browser).toContain("height: emojiBrowserMetrics.categoryHeight");
	expect(browser).toContain("height: emojiBrowserMetrics.rowHeight");
	expect(browser).toContain('accessibilityLabel="Emoji categories"');
	expect(browser).toContain('overflow: "hidden"');
	expect(browser).not.toContain('position: "absolute"');
	expect(shortcuts).toContain("header={");
	expect(shortcuts).toContain("<ReactionShortcuts");
});

test("emoji search uses actual names, keywords and glyphs without a fake recent catalog", (): void => {
	const people = emojiResults(
		emojiData.emojis,
		emojiData.categories,
		"people",
		"",
	);
	expect(people.length).toBeGreaterThan(100);
	expect(new Set(people.map((entry) => entry.id)).size).toBe(people.length);
	const search = emojiResults(
		emojiData.emojis,
		emojiData.categories,
		"flags",
		" laughing ",
	);
	expect(search.length).toBeGreaterThan(0);
	expect(
		emojiResults(emojiData.emojis, emojiData.categories, "people", "❤️").some(
			(entry) => entry.skins.some((skin) => skin.native === "❤️"),
		),
	).toBe(true);
	expect(
		emojiResults(
			emojiData.emojis,
			emojiData.categories,
			"people",
			"nonexistent-emoji-phrase",
		),
	).toEqual([]);
	expect(
		emojiResults(emojiData.emojis, emojiData.categories, "missing", ""),
	).toEqual([]);
});

test("skin tones use real variants and unsupported variants keep the original glyph", (): void => {
	const thumbs = Object.values(emojiData.emojis).find(
		(entry) => entry.skins.at(0)?.native === "👍",
	);
	if (!thumbs) throw new Error("Missing canonical emoji");
	expect(emojiVariant(thumbs, 0)).toBe("👍");
	expect(emojiVariant(thumbs, 5)).not.toBe("👍");
	expect(emojiVariant(thumbs, 99)).toBe("👍");
});
