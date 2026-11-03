import type { Category, Emoji } from "@emoji-mart/data";
import { geometry, space } from "./tokens";

const glyphLineHeight = 40;
const rowHeight = Math.max(geometry.touch, glyphLineHeight + space.xxs * 2);
export const emojiBrowserMetrics = {
	glyphSize: 32,
	glyphLineHeight,
	rowHeight,
	categoryHeight: rowHeight + space.xs + geometry.border,
	gridMaxHeight: geometry.popupMaxHeight,
};

export const emojiCategories: Record<string, { label: string; glyph: string }> =
	{
		people: { label: "Smileys & people", glyph: "😀" },
		nature: { label: "Animals & nature", glyph: "🐻" },
		foods: { label: "Food & drink", glyph: "🍎" },
		activity: { label: "Activities", glyph: "⚽️" },
		places: { label: "Travel & places", glyph: "🚗" },
		objects: { label: "Objects", glyph: "💡" },
		symbols: { label: "Symbols", glyph: "🔣" },
		flags: { label: "Flags", glyph: "🏁" },
	};
export const emojiColumns = (width: number): number =>
	Math.max(1, Math.min(7, Math.floor(width / geometry.touch)));

const emojiSearchIndexes = new WeakMap<
	Record<string, Emoji>,
	{ emoji: Emoji; search: string }[]
>();
const emojiSearchIndex = (
	emojis: Record<string, Emoji>,
): { emoji: Emoji; search: string }[] => {
	const cached = emojiSearchIndexes.get(emojis);
	if (cached) return cached;
	const index = Object.values(emojis).map((emoji) => ({
		emoji,
		search:
			`${emoji.name} ${emoji.keywords.join(" ")} ${emoji.skins.map((skin) => skin.native).join(" ")}`.toLowerCase(),
	}));
	emojiSearchIndexes.set(emojis, index);
	return index;
};
export const emojiResults = (
	emojis: Record<string, Emoji>,
	categories: Category[],
	category: string,
	search: string,
): Emoji[] => {
	const query = search.trim().toLowerCase();
	return query
		? emojiSearchIndex(emojis)
				.filter((entry) => entry.search.includes(query))
				.map((entry) => entry.emoji)
		: (categories.find((entry) => entry.id === category)?.emojis ?? []).flatMap(
				(id) => (emojis[id] ? [emojis[id]] : []),
			);
};
export const emojiVariant = (emoji: Emoji, tone: number): string =>
	emoji.skins.at(tone)?.native ?? emoji.skins.at(0)?.native ?? "";
