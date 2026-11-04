import { expect, test } from "bun:test";
import { inspectNavigationBoundary } from "../scripts/navigation-boundary";

test("native route animation must use the shared reduced-motion policy", (): void => {
	const source = (animation: string): string =>
		`const options = { animation: ${animation}, contentStyle: { backgroundColor: theme.background.canvas } };`;
	expect(
		inspectNavigationBoundary(
			source("nativeStackAnimation(route.name, motionEnabled)"),
			"app-router.native.tsx",
		),
	).toEqual([]);
	for (const animation of ['"fade"', '"slide_from_right"', '"default"'])
		expect(
			inspectNavigationBoundary(source(animation), "app-router.native.tsx"),
		).toEqual([expect.stringContaining("shared reduced-motion stack policy")]);
});

test("native detail transitions cannot introduce animation to web routes or tab switches", (): void => {
	for (const filename of ["app-router.tsx", "main-tabs-fallback.tsx"])
		expect(
			inspectNavigationBoundary(
				'const options = { animation: "default", contentStyle: { backgroundColor: theme.background.canvas } };',
				filename,
			),
		).toEqual([
			expect.stringContaining("Web and tab navigation must switch instantly"),
		]);
});
