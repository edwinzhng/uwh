import { expect, test } from "bun:test";
import { watercolorRenderSize } from "../src/design-system/watercolor-render-size";

test("native shader render targets stay bounded across density, aspect ratio and resize", (): void => {
	for (const [width, height] of [
		[390, 120],
		[1170, 360],
		[360, 1170],
		[3000, 2000],
		[1000000, 1],
		[1, 1000000],
	]) {
		if (width === undefined || height === undefined)
			throw new Error("Missing dimensions");
		const size = watercolorRenderSize(width, height);
		expect(size.width).toBeGreaterThanOrEqual(1);
		expect(size.height).toBeGreaterThanOrEqual(1);
		expect(size.width * size.height).toBeLessThanOrEqual(80000);
		expect(size.width).toBeLessThanOrEqual(width);
		expect(size.height).toBeLessThanOrEqual(height);
	}
});

test("small surfaces keep their detail and invalid sizes cannot allocate a render target", (): void => {
	expect(watercolorRenderSize(100, 80)).toEqual({ width: 100, height: 80 });
	for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
		expect(() => watercolorRenderSize(size, 100)).toThrow();
});
