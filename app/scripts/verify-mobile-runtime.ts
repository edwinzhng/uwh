import assert from "node:assert/strict";
import { rainbowPalette } from "../src/design-system/rainbow-palette";

type ExpoManifest = { launchAsset: { url: string } };
type LocalStatus = {
	deliveryDisabled: boolean;
	counts: Record<string, number>;
	actualCounts: Record<string, number>;
};

const localEnvironment = Object.fromEntries(
	(await Bun.file(".env.development.local").text())
		.split("\n")
		.flatMap((line) => {
			const match = line.match(/^(EXPO_PUBLIC_CONVEX(?:_SITE)?_URL)=(.+)$/);
			return match ? [[match.at(1) ?? "", match.at(2)?.trim() ?? ""]] : [];
		}),
);
const backend = localEnvironment.EXPO_PUBLIC_CONVEX_URL;
const site = localEnvironment.EXPO_PUBLIC_CONVEX_SITE_URL;
assert(
	backend && site,
	"Configure the phone's local backend and auth-site URLs.",
);
assert(!["localhost", "127.0.0.1"].includes(new URL(backend).hostname));

for (const platform of ["ios", "android"]) {
	const manifestResponse = await fetch("http://127.0.0.1:8081/", {
		headers: { "Expo-Platform": platform, Accept: "application/expo+json" },
	});
	assert.equal(manifestResponse.status, 200);
	const manifest: ExpoManifest = await manifestResponse.json();
	assert.equal(typeof manifest.launchAsset?.url, "string");
	const source = new URL(manifest.launchAsset.url);
	assert(
		["127.0.0.1", "localhost", new URL(backend).hostname].includes(
			source.hostname,
		),
	);
	source.searchParams.set("lazy", "false");
	const response = await fetch(source);
	assert.equal(
		response.status,
		200,
		`The actual ${platform} Metro bundle must compile.`,
	);
	const bundle = await response.text();
	assert(
		bundle.includes("contextPickerPresentation") &&
			bundle.includes("mobilePresentation") &&
			bundle.includes("ContextTrigger"),
		"The running bundle must include contextual mobile view pickers and the sheet trigger.",
	);
	assert(
		Object.values(rainbowPalette)
			.flatMap(Object.values)
			.every((color) => bundle.includes(color)),
		"The running bundle must include the approved seven-hue, three-shade palette.",
	);
	const files = new Map(
		Array.from(
			bundle.matchAll(
				/var _default = (\{[^{}]*"EXPO_PUBLIC_CONVEX_URL"[^{}]*\});\s*\},\d+,\[\],"(\.env[^" ]*)"/g,
			),
			(match): [string, Record<string, string>] => [
				match.at(2) ?? "",
				JSON.parse(match.at(1) ?? "{}"),
			],
		),
	);
	assert(
		files.has(".env.development.local"),
		"The native local-runtime override is missing.",
	);
	const effective = Object.fromEntries(
		[
			".env",
			".env.development",
			".env.local",
			".env.development.local",
		].flatMap((filename) => Object.entries(files.get(filename) ?? {})),
	);
	assert.equal(
		effective.EXPO_PUBLIC_CONVEX_URL,
		backend,
		"Phone and browser must share the real-data local backend.",
	);
	assert.equal(effective.EXPO_PUBLIC_CONVEX_SITE_URL, site);
	assert(
		bundle.includes("RNSTabsHostIOS"),
		"The current native-navigation capability guard must be present.",
	);
	assert(
		bundle.includes("HomeSummary"),
		"The new Home layout must be present in the running bundle.",
	);
	assert(
		/fitness:\s*\{\s*icon:\s*"barChart",\s*category:\s*"fern"/.test(bundle),
		"Fitness must use the shared chart icon and green accent in the running bundle.",
	);
	assert(
		bundle.includes("createPushRegistrationController") &&
			bundle.includes("request, devicePushToken") &&
			bundle.includes("Promise.resolve().then(() => synchronize(token))"),
		"The bounded native push-registration hotfix must be present.",
	);
	assert(
		bundle.includes("tintColor: colors.selected") &&
			bundle.includes("highContrastLight:"),
		"The adaptive native tab selection colors must be present.",
	);
	assert(
		bundle.includes("ScreenErrorBoundary") && bundle.includes("RecoveryScreen"),
		"The native screen-recovery boundary must be present.",
	);
	assert(
		bundle.includes(".pages.homeAnnouncements"),
		"The Home announcement cursor continuation must be present.",
	);
	assert(
		bundle.includes("ToolbarGroup") &&
			bundle.includes("Account and notifications") &&
			bundle.includes('"shield"'),
		"The compact native toolbar and shield navigation must be present.",
	);
	console.log(
		`${platform}: actual Metro bundle HTTP 200; local LAN backend verified (${bundle.length} bytes).`,
	);
}

const child = Bun.spawn(
	[
		process.execPath,
		"scripts/local-convex.ts",
		"run",
		"local_migration:status",
		"{}",
	],
	{ stdout: "pipe", stderr: "pipe" },
);
const [stdout] = await Promise.all([
	new Response(child.stdout).text(),
	new Response(child.stderr).text(),
]);
assert.equal(
	await child.exited,
	0,
	"The guarded real-account migration status must be readable.",
);
const status: LocalStatus = JSON.parse(stdout.trim());
assert(status.deliveryDisabled, "All outbound delivery must remain disabled.");
for (const [kind, count] of Object.entries({
	members: 74,
	events: 349,
	responses: 3737,
	feedback: 41,
	coachingHours: 196,
	fitnessResults: 276,
}))
	assert(
		(status.actualCounts[kind] ?? 0) >= count,
		`The real-data local backend is missing ${kind}.`,
	);
assert(
	(status.counts.resources ?? 0) >= 32,
	"All video and document resources must be loaded.",
);
console.log(
	"Real-account club history loaded; demo isolation and detailed relationships are checked by verify-local-history.",
);
