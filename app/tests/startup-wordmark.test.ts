import { expect, test } from "bun:test";
import {
	loadingWordmarkPath,
	loadingWordmarkViewBox,
} from "../src/design-system/loading-wordmark-path";

test("startup wordmark reserves vector bounds without waiting for a font or text measurement", async (): Promise<void> => {
	const box = loadingWordmarkViewBox.split(" ").map(Number);
	expect(box.every(Number.isFinite)).toBe(true);
	expect(box.at(2)).toBeGreaterThan(0);
	expect(box.at(3)).toBeGreaterThan(0);
	expect(loadingWordmarkPath.length).toBeGreaterThan(100);
	const screen = await Bun.file("src/design-system/loading-screen.tsx").text();
	expect(screen).toContain("<LoadingWordmark width={size}");
	expect(screen).not.toContain("isLoaded");
	expect(screen).not.toContain("numberOfLines");
	const reveal = await Bun.file(
		"src/design-system/loading-reveal.web.tsx",
	).text();
	expect(reveal).toContain('transitionProperty: "transform, opacity"');
	expect(reveal).not.toContain("requestAnimationFrame");
});
