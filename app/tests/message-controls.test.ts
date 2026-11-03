import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	contextMenuKey,
	invokeMenuAction,
} from "../src/design-system/context-menu-policy";
import {
	messageBubbleLayout,
	messageMenuOffset,
	showMessageReaction,
} from "../src/design-system/message-bubble-layout";
import { MessageMenuPosition } from "../src/design-system/message-menu-position.web";
import type { MenuGroup } from "../src/design-system/picker-props";
import { PopupStyles } from "../src/design-system/popup-styles.web";
import { geometry, space } from "../src/design-system/tokens";

describe("compact message controls", () => {
	test("the narrow overflow position does not intercept the reaction target beneath it", (): void => {
		const markup = renderToStaticMarkup(
			MessageMenuPosition({
				outgoing: true,
				separate: false,
				children: createElement(
					"button",
					{ type: "button" },
					"Message actions",
				),
			}),
		);
		expect(markup).toContain("pointer-events:none");
		expect(markup).toContain("Message actions");
	});
	test("desktop menu and reaction targets have independent lanes with a real gap", (): void => {
		for (const width of [480, 512, 600, 720, 1024]) {
			const layout = messageBubbleLayout(width, true);
			expect(layout.separateMenu).toBe(true);
			const menuEnd = -messageMenuOffset(true);
			const menuStart = menuEnd - geometry.touch;
			const reactionEnd = geometry.touch + space.xxs;
			expect(menuStart - reactionEnd).toBeGreaterThanOrEqual(space.xs);
			expect((layout.maxWidth ?? 0) + menuEnd).toBeLessThanOrEqual(width);
		}
		for (const width of [248, 296, 366, 430])
			expect(messageBubbleLayout(width, true).separateMenu).toBe(false);
	});

	test("the bubble itself is bounded inside the native intrinsic-size menu wrapper", async (): Promise<void> => {
		const [bubble, menu] = await Promise.all([
			Bun.file("src/design-system/message-bubble.tsx").text(),
			Bun.file("src/design-system/context-action-menu.tsx").text(),
		]);
		const content = bubble.slice(
			bubble.indexOf("const bubble ="),
			bubble.indexOf("return ("),
		);
		expect(content).toContain("maxWidth: layout.maxWidth");
		expect(content).toContain("flexShrink: 1");
		expect(bubble).toContain("viewport.width - space.sm * 2");
		expect(menu).toContain(
			'style={{ maxWidth: "100%", minWidth: 0, flexShrink: 1 }}',
		);
	});
	test("corner reactions have a separate 44-point lane without a flex sibling squeezing the bubble", (): void => {
		for (const width of [248, 272, 296, 366, 600, 720, 1024]) {
			const layout = messageBubbleLayout(width, true);
			expect(layout.maxWidth).toBeDefined();
			expect(width - (layout.maxWidth ?? 0)).toBeGreaterThanOrEqual(
				geometry.touch + space.xxs,
			);
			expect(layout.maxWidth).toBeLessThanOrEqual(width * 0.84);
		}
		expect(messageBubbleLayout(296, true).maxWidth).toBe(248);
		expect(messageBubbleLayout(0, true).maxWidth).toBeUndefined();
	});

	test("narrow rows never expose overlapping reaction and keyboard-overflow targets", (): void => {
		const narrow = messageBubbleLayout(296, true);
		expect(narrow.separateMenu).toBe(false);
		expect(showMessageReaction(false, narrow.separateMenu)).toBe(true);
		expect(showMessageReaction(true, narrow.separateMenu)).toBe(false);
		const wide = messageBubbleLayout(720, true);
		expect(wide.separateMenu).toBe(true);
		expect(showMessageReaction(true, wide.separateMenu)).toBe(true);
	});

	test("keyboard context actions support Shift+F10 and the context-menu key without intercepting ordinary typing", (): void => {
		expect(contextMenuKey("F10", true)).toBe(true);
		expect(contextMenuKey("ContextMenu", false)).toBe(true);
		for (const key of ["F10", "Enter", " ", "Escape", "a"])
			expect(contextMenuKey(key, false)).toBe(false);
	});

	test("native context actions recheck current permission and exact group/action identity", (): void => {
		const calls: string[] = [];
		const groups: MenuGroup[] = [
			{
				id: "message",
				items: [
					{
						id: "reply",
						label: "Reply",
						onSelect: (): void => {
							calls.push("reply");
						},
					},
					{
						id: "pin",
						label: "Pin",
						isDisabled: true,
						onSelect: (): void => {
							calls.push("pin");
						},
					},
				],
			},
		];
		expect(invokeMenuAction(groups, "reply")).toBe(false);
		expect(invokeMenuAction(groups, "other:reply")).toBe(false);
		expect(invokeMenuAction(groups, "message:reply", true)).toBe(false);
		expect(invokeMenuAction(groups, "message:pin")).toBe(false);
		expect(calls).toEqual([]);
		expect(invokeMenuAction(groups, "message:reply")).toBe(true);
		expect(calls).toEqual(["reply"]);
	});

	test("reactions stay visible at rest while desktop overflow is only pointer-active with room or keyboard focus", (): void => {
		const styles = renderToStaticMarkup(createElement(PopupStyles));
		expect(styles).not.toContain('button[aria-label="Add reaction"]');
		expect(styles).toContain(
			'.club-message-menu-trigger:focus-visible, .club-message-menu-trigger[aria-expanded="true"]',
		);
		expect(styles).toContain(
			".club-message-row:hover .club-message-menu-position[data-separate]",
		);
	});

	test("context menus do not group poll controls, intercept their touch-start, or eagerly import optional ExpoUI", async (): Promise<void> => {
		const native = await Bun.file(
			"src/design-system/context-action-menu.tsx",
		).text();
		const web = await Bun.file(
			"src/design-system/context-action-menu.web.tsx",
		).text();
		const trigger = await Bun.file(
			"src/design-system/message-reaction-trigger.tsx",
		).text();
		expect(native).toContain("shouldOpenOnLongPress");
		expect(native).toContain("accessible={false}");
		expect(native).not.toMatch(/from ["']@expo\/ui/u);
		expect(web).toContain("<ContextMenu.Trigger");
		expect(web).toContain("event.preventBaseUIHandler()");
		expect(web).toContain("interactiveTarget(event.target)");
		expect(trigger).toContain('name: "showMenu", label: "Message actions"');
	});
});
