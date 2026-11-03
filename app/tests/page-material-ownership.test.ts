import { expect, test } from "bun:test";

const source = (name: string): Promise<string> =>
	Bun.file(`${import.meta.dir}/../src/design-system/${name}`).text();

test("one background lives above routes, authentication and loading", async (): Promise<void> => {
	expect(await source("provider.tsx")).toContain("<PageMaterialBackground />");
	for (const name of [
		"app-layout.tsx",
		"auth-layout.tsx",
		"loading-screen.tsx",
	])
		expect(await source(name)).not.toContain("PageMaterialBackground");
	const background = await source("page-material-background.tsx");
	expect(background).toContain("StyleSheet.absoluteFill");
	expect(background).toContain('materialVariation("app-background")');
	expect(background).not.toContain("useId");
	expect(background).not.toContain("seed={pathname}");
	expect(background).not.toContain("LinearGradient");
});

test("navigation scenes reveal the shared background on native and web", async (): Promise<void> => {
	expect(await source("provider.tsx")).toContain('background: "transparent"');
	expect(await source("app-layout.tsx")).toContain(
		'Platform.OS !== "web" || focused',
	);
	expect(await source("app-layout.tsx")).toContain("opacity: visible ? 1 : 0");
	for (const name of ["app-router.tsx", "main-tabs-fallback.tsx"])
		expect(await source(name)).toContain('backgroundColor: "transparent"');
	expect(
		(await source("main-tabs.native.tsx")).match(
			/contentStyle=\{\{ backgroundColor: "transparent" \}\}/g,
		),
	).toHaveLength(4);
});

test("performance background keeps only its two forest textures across navigation", async (): Promise<void> => {
	const background = await source("page-material-background.tsx");
	expect(background).toContain("[material].fern[theme.mode]");
	expect(background).not.toContain("usePathname");
	expect(background).not.toContain("MaterialColorLayer");
	expect(background).toContain("pageMaterialOpacity[theme.mode]");
});
