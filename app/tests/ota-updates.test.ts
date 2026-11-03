import { expect, test } from "bun:test";
import config from "../app.config";
import eas from "../eas.json";
import manifest from "../package.json";

test("native updates target the linked Expo project and fingerprint-compatible binaries", (): void => {
	expect(manifest.dependencies["expo-updates"]).toBeDefined();
	expect(config.updates?.url).toBe(
		`https://u.expo.dev/${config.extra?.eas.projectId}`,
	);
	expect(config.runtimeVersion).toEqual({ policy: "fingerprint" });
	expect(config.updates?.enabled).toBe(true);
	expect(config.updates?.checkAutomatically).toBe("ON_LOAD");
	expect(config.updates?.fallbackToCacheTimeout).toBe(0);
	expect(config.updates?.disableAntiBrickingMeasures).not.toBe(true);
	expect(config.updates?.useEmbeddedUpdate).not.toBe(false);
});

test("preview and production builds and update commands use matching isolated channels and environments", (): void => {
	for (const environment of ["preview", "production"] as const) {
		const profile = eas.build[environment];
		expect(profile.channel).toBe(environment);
		expect(profile.environment).toBe(environment);
		const command = manifest.scripts[`update:${environment}`];
		expect(command).toContain(`--channel ${profile.channel}`);
		expect(command).toContain(`--environment ${profile.environment}`);
		expect(command).toContain("EXPO_NO_DOTENV=1");
		expect(command).toContain("--clear-cache");
		expect(command).not.toContain("--auto");
	}
	expect(eas.build.preview.channel).not.toBe(eas.build.production.channel);
});
