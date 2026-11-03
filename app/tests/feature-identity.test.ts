import { expect, test } from "bun:test";
import { featureIdentity } from "../src/design-system/feature-identity";

test("fitness uses one icon and one accent across Home and Club", async (): Promise<void> => {
	expect(featureIdentity.fitness).toEqual({
		icon: "barChart",
		category: "fern",
	});
	const home = await Bun.file("src/features/home-fitness.tsx").text();
	const club = await Bun.file("src/features/club-tool-links.ts").text();
	expect(home).toContain("icon={featureIdentity.fitness.icon}");
	expect(home).toContain("category={featureIdentity.fitness.category}");
	expect(club).toContain("icon: featureIdentity.fitness.icon");
	const icons = await Bun.file("src/design-system/icon.tsx").text();
	expect(icons).toContain("lab: ChartColumn");
	expect(icons).toContain("waves: ChartColumn");
	expect(icons).not.toContain("assets/icons/");
	for (const path of [
		"src/features/club-tool-links.ts",
		"src/features/coach-dashboard.tsx",
	])
		expect(await Bun.file(path).text()).toContain(
			"featureIdentity.fitness.icon",
		);
	expect(icons).not.toContain("dimensionalIconAssets");
});

test("Club navigation uses the platform shield without a custom image", async (): Promise<void> => {
	const source = await Bun.file(
		"src/design-system/main-tabs.native.tsx",
	).text();
	expect(source).toContain(
		'<NativeTabs.Trigger.Icon sf="shield" md="shield" />',
	);
	expect(source).not.toContain("club-croc");
});

test("the account sheet always exposes a selected profile row, including single-profile accounts", async (): Promise<void> => {
	const source = await Bun.file(
		"src/design-system/person-picker-fallback.tsx",
	).text();
	expect(source).toContain('title="Profiles"');
	expect(source).toContain("Current profile");
	expect(source).not.toContain("{canSwitch\n");
});
