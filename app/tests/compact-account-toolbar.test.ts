import { expect, test } from "bun:test";
import { darkTheme, lightTheme } from "../src/design-system/tokens";

test("page canvases and cards retain separate surfaces", (): void => {
	expect(lightTheme.background.canvas).toBe("#F7F8F5");
	expect(darkTheme.background.canvas).toBe("#121812");
	expect(darkTheme.background.primary).not.toBe(darkTheme.background.canvas);
});
