import { expect, test } from "bun:test";
import {
	duplicateSiblingKeys,
	eagerBrowserOperations,
	optionalNativePackage,
	runtimeImports,
} from "../scripts/check-native-safety";

test("direct JSX siblings cannot reuse the same explicit key", (): void => {
	expect(
		duplicateSiblingKeys(
			"const ui = <Stack><Profile key={person.id} /><Membership key={person.id} /></Stack>",
			"fixture.tsx",
		),
	).toEqual(["fixture.tsx: {person.id}"]);
	expect(
		duplicateSiblingKeys(
			"const ui = <Stack key={person.id}><Profile /><Membership /></Stack>",
			"fixture.tsx",
		),
	).toEqual([]);
});

test("boot traversal excludes type-only and deferred imports", (): void => {
	expect(
		runtimeImports(
			'import type { AudioRecorder } from "expo-audio"; import { type VideoPlayer } from "expo-video"; export type { File } from "expo-file-system"; const load = () => import("expo-audio"); import { lazy } from "react";',
			"test.ts",
		),
	).toEqual(["react"]);
});
test("native boot rejects eager browser fixture constructors but permits action-owned media", (): void => {
	expect(
		eagerBrowserOperations(
			"const fixture = new Blob([new Uint8Array([1])]); const url = URL.createObjectURL(fixture); const deferred = () => new FileReader();",
			"fixture.ts",
		),
	).toEqual(["Blob", "URL.createObjectURL"]);
	expect(
		eagerBrowserOperations(
			"const createFixture = () => new Blob([new Uint8Array([1])]);",
			"deferred.ts",
		),
	).toEqual([]);
});
test("native feature package subpaths cannot bypass the startup import guard", (): void => {
	for (const name of [
		"expo-clipboard",
		"expo-notifications",
		"expo-web-browser",
		"@expo/ui/community/menu",
		"expo-audio/build/index",
	])
		expect(optionalNativePackage(name)).toBe(true);
	expect(optionalNativePackage("expo-router")).toBe(false);
	expect(optionalNativePackage("expo-glass-effect-safe")).toBe(false);
});
