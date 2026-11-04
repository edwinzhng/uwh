import { expect, test } from "bun:test";
import { inspectNavigationBoundary } from "./navigation-boundary";

test("navigation requires instant transitions and opaque route surfaces", (): void => {
	const valid =
		'const options = { animation: "none", contentStyle: { backgroundColor: theme.background.canvas } };';
	expect(
		inspectNavigationBoundary(valid, "src/design-system/app-router.tsx"),
	).toEqual([]);
	for (const source of [
		valid.replace('"none"', '"fade"'),
		valid.replace('"none"', 'animate ? "fade" : "none"'),
		valid.replace("theme.background.canvas", '"transparent"'),
		'const options = { animation: "none" };',
		"const options = { contentStyle: { backgroundColor: theme.background.canvas } };",
	])
		expect(
			inspectNavigationBoundary(source, "src/design-system/app-router.tsx")
				.length,
		).toBeGreaterThan(0);
});

test("native tab scene attributes cannot be transparent", (): void => {
	const valid =
		"<NativeTabs.Trigger contentStyle={{ backgroundColor: theme.background.canvas }} />";
	expect(
		inspectNavigationBoundary(valid, "src/design-system/main-tabs.native.tsx"),
	).toEqual([]);
	expect(
		inspectNavigationBoundary(
			valid.replace("theme.background.canvas", '"transparent"'),
			"src/design-system/main-tabs.native.tsx",
		).length,
	).toBeGreaterThan(0);
});

test("page layout requires keyed readiness and forbids reveal escape hatches", (): void => {
	const valid =
		"<PageReady contentKey={routeParameters}><Stack>{children}</Stack></PageReady>";
	expect(
		inspectNavigationBoundary(valid, "src/design-system/app-layout.tsx"),
	).toEqual([]);
	for (const source of [
		valid.replace(" contentKey={routeParameters}", ""),
		valid.replaceAll("Stack", "PageReveal"),
		`import Animated from "react-native-reanimated"; ${valid}`,
		`type Props = { transition?: "fade" | "instant" }; ${valid}`,
	])
		expect(
			inspectNavigationBoundary(source, "src/design-system/app-layout.tsx")
				.length,
		).toBeGreaterThan(0);
});

test("optional home data must participate in initial page readiness", (): void => {
	const valid =
		"const Highlight = () => { const result = useQuery(api.feedback, {}); usePageLoading(result === undefined); return result ? <Card /> : undefined; };";
	expect(
		inspectNavigationBoundary(valid, "src/features/home-highlight.tsx"),
	).toEqual([]);
	expect(
		inspectNavigationBoundary(
			valid.replace("usePageLoading(result === undefined);", ""),
			"src/features/home-highlight.tsx",
		).length,
	).toBeGreaterThan(0);
});
