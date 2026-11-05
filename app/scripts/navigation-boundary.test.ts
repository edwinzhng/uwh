import { expect, test } from "bun:test";
import { inspectNavigationBoundary } from "./navigation-boundary";

test("club summary queries register readiness before metric card materials appear", (): void => {
	const source =
		"const Summary = () => { const summary = useQuery(api.club.summary, {}); return children(summary?.registered); };";
	expect(
		inspectNavigationBoundary(source, "src/features/club-summary-data.tsx"),
	).toHaveLength(1);
	expect(
		inspectNavigationBoundary(
			source.replace(
				"return children",
				"usePageLoading(summary === undefined); return children",
			),
			"src/features/club-summary-data.tsx",
		),
	).toHaveLength(0);
});

test("dynamic native headers reject inline navigation options while static named screens remain valid", (): void => {
	expect(
		inspectNavigationBoundary(
			"<RouterStack.Screen options={{ title, headerRight: () => <Account /> }} />",
			"src/design-system/native-screen-header.tsx",
		),
	).toHaveLength(1);
	expect(
		inspectNavigationBoundary(
			"<RouterStack.Screen options={options} />",
			"src/design-system/native-screen-header.tsx",
		),
	).toHaveLength(0);
	expect(
		inspectNavigationBoundary(
			'<RouterStack.Screen name="session" options={{ title: "Practice" }} />',
			"app/_layout.tsx",
		),
	).toHaveLength(0);
});

test("native navigator headers stay disabled so page titles and controls have one shared owner", (): void => {
	const options =
		"const options = { headerShown: false, animation: nativeStackAnimation(route.name, motion), contentStyle: { backgroundColor: theme.background.canvas } };";
	expect(
		inspectNavigationBoundary(
			options,
			"src/design-system/app-router.native.tsx",
		),
	).toHaveLength(0);
	expect(
		inspectNavigationBoundary(
			options.replace("headerShown: false", "headerShown: true"),
			"src/design-system/app-router.native.tsx",
		),
	).toHaveLength(1);
});

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
