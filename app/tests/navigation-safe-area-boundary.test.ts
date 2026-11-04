import { expect, test } from "bun:test";
import { inspectNavigationBoundary } from "../scripts/navigation-boundary";

test("shared shell rejects native safe-area padding even through an aliased import", (): void => {
	const failures = inspectNavigationBoundary(
		'import { SafeAreaView as Screen } from "react-native-safe-area-context"; const Layout = () => <Screen><PageReady contentKey="route" /></Screen>;',
		"src/design-system/app-layout.tsx",
	);
	expect(failures).toHaveLength(1);
	expect(failures.at(0)).toContain("React safe-area insets");
});

test("shared shell accepts React-owned insets and explicit page readiness", (): void => {
	expect(
		inspectNavigationBoundary(
			'import { useSafeAreaInsets } from "react-native-safe-area-context"; const Layout = () => <View><PageReady contentKey="route" /></View>;',
			"src/design-system/app-layout.tsx",
		),
	).toEqual([]);
});

test("mounted screen layouts reject globally active route hooks, including aliases", (): void => {
	for (const filename of ["app-layout.tsx", "club-shell.tsx"])
		for (const hook of ["usePathname", "useSegments", "useGlobalSearchParams"])
			expect(
				inspectNavigationBoundary(
					`import { ${hook} as activeRoute } from "expo-router"; const Layout = () => <PageReady contentKey="route" />;`,
					filename,
				),
			).toEqual([
				expect.stringContaining("Screen layout must use its own route"),
			]);
});
