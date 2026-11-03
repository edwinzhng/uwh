import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const optionalPackages = new Set([
	"expo-audio",
	"expo-video",
	"expo-file-system",
	"expo-sharing",
	"expo-document-picker",
	"expo-image-picker",
	"expo-image-manipulator",
	"expo-video-thumbnails",
	"expo-glass-effect",
	"expo-haptics",
	"expo-clipboard",
	"expo-web-browser",
	"expo-notifications",
	"expo-speech-recognition",
	"@expo/ui",
]);

const optionalNativePackage = (name: string): boolean =>
	[...optionalPackages].some(
		(optional) => name === optional || name.startsWith(`${optional}/`),
	);

const runtimeImports = (source: string, filename: string): string[] => {
	const parsed = ts.createSourceFile(
		filename,
		source,
		ts.ScriptTarget.Latest,
		true,
	);
	return parsed.statements.flatMap((statement): string[] => {
		if (
			!(
				ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
			) ||
			!statement.moduleSpecifier ||
			!ts.isStringLiteral(statement.moduleSpecifier)
		)
			return [];
		if (ts.isExportDeclaration(statement) && statement.isTypeOnly) return [];
		if (ts.isImportDeclaration(statement) && statement.importClause) {
			const clause = statement.importClause;
			if (
				clause.isTypeOnly ||
				(!clause.name &&
					clause.namedBindings &&
					ts.isNamedImports(clause.namedBindings) &&
					clause.namedBindings.elements.every((element) => element.isTypeOnly))
			)
				return [];
		}
		return [statement.moduleSpecifier.text];
	});
};

const eagerBrowserOperations = (source: string, filename: string): string[] => {
	const parsed = ts.createSourceFile(
		filename,
		source,
		ts.ScriptTarget.Latest,
		true,
	);
	const failures: string[] = [];
	const inspect = (node: ts.Node): void => {
		if (ts.isFunctionLike(node)) return;
		if (
			ts.isNewExpression(node) &&
			ts.isIdentifier(node.expression) &&
			[
				"Blob",
				"File",
				"FileReader",
				"Audio",
				"MediaRecorder",
				"DOMParser",
			].includes(node.expression.text)
		)
			failures.push(node.expression.text);
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.expression.getText(parsed) === "URL" &&
			node.expression.name.text === "createObjectURL"
		)
			failures.push("URL.createObjectURL");
		ts.forEachChild(node, inspect);
	};
	inspect(parsed);
	return failures;
};

const nativeModulePath = (path: string, platform: string): string | undefined =>
	[
		`${path}.${platform}.tsx`,
		`${path}.${platform}.ts`,
		`${path}.native.tsx`,
		`${path}.native.ts`,
		`${path}.tsx`,
		`${path}.ts`,
		`${path}/index.tsx`,
		`${path}/index.ts`,
	].find(existsSync);

const duplicateSiblingKeys = (source: string, filename: string): string[] => {
	const parsed = ts.createSourceFile(
		filename,
		source,
		ts.ScriptTarget.Latest,
		true,
	);
	const failures: string[] = [];
	const inspect = (node: ts.Node): void => {
		if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
			const keys = node.children.flatMap((child) => {
				const opening = ts.isJsxElement(child)
					? child.openingElement
					: ts.isJsxSelfClosingElement(child)
						? child
						: undefined;
				const key = opening?.attributes.properties.find(
					(attribute) =>
						ts.isJsxAttribute(attribute) &&
						attribute.name.getText(parsed) === "key",
				);
				const value =
					key && ts.isJsxAttribute(key)
						? key.initializer?.getText(parsed)
						: undefined;
				return value ? [value] : [];
			});
			for (const key of new Set(
				keys.filter((key, index) => keys.indexOf(key) !== index),
			))
				failures.push(`${filename}: ${key}`);
		}
		ts.forEachChild(node, inspect);
	};
	inspect(parsed);
	return failures;
};

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
	const failures = [
		...new Bun.Glob("{src,app}/**/*.tsx").scanSync({
			cwd: resolve(import.meta.dir, ".."),
			absolute: true,
		}),
	].flatMap((filename) =>
		duplicateSiblingKeys(readFileSync(filename, "utf8"), filename),
	);
	expect(failures).toEqual([]);
});

test("client code avoids runtime methods missing from the installed development client", (): void => {
	const files = new Bun.Glob("src/**/*.{ts,tsx}").scanSync({
		cwd: resolve(import.meta.dir, ".."),
		absolute: true,
	});
	const failures = [...files].flatMap((filename) =>
		readFileSync(filename, "utf8")
			.split("\n")
			.flatMap((line, index) =>
				/\.(toSorted|toReversed|toSpliced|findLast|findLastIndex)\s*\(|Object\.hasOwn\s*\(|URL\.(canParse|parse)\s*\(/.test(
					line,
				)
					? [`${filename}:${index + 1}`]
					: [],
			),
	);
	expect(failures).toEqual([]);
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

for (const platform of ["ios", "android"]) {
	test(`${platform} route registration never eagerly imports optional feature modules`, (): void => {
		const routes = [
			...new Bun.Glob("app/**/*.tsx").scanSync({
				cwd: resolve(import.meta.dir, ".."),
				absolute: true,
			}),
		];
		const visited = new Set<string>();
		const queue = [...routes];
		const failures: string[] = [];
		for (const filename of queue) {
			if (visited.has(filename)) continue;
			visited.add(filename);
			const source = readFileSync(filename, "utf8");
			for (const operation of eagerBrowserOperations(source, filename))
				failures.push(`${filename}: eager ${operation}`);
			for (const moduleName of runtimeImports(source, filename)) {
				if (optionalNativePackage(moduleName))
					failures.push(`${filename}: ${moduleName}`);
				if (moduleName.endsWith("/resource-media-fixtures"))
					failures.push(
						`${filename}: sample binary media must load only inside preview actions`,
					);
				if (!moduleName.startsWith(".")) continue;
				const next = nativeModulePath(
					resolve(dirname(filename), moduleName),
					platform,
				);
				if (next) queue.push(next);
			}
		}
		expect(visited.size).toBeGreaterThan(100);
		expect(failures).toEqual([]);
	});
}

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

test("clipboard and browser sign-in check native capability before deferred module evaluation", (): void => {
	for (const [filename, capability, packageName] of [
		["src/platform/clipboard.ts", "ExpoClipboard", "expo-clipboard"],
		["src/backend/auth-browser.ts", "ExpoWebBrowser", "expo-web-browser"],
	] as const) {
		const source = readFileSync(
			resolve(import.meta.dir, "..", filename),
			"utf8",
		);
		expect(runtimeImports(source, filename)).not.toContain(packageName);
		const guard = source.indexOf(`requireNativeFeature("${capability}"`);
		const load = source.indexOf(`import("${packageName}")`);
		expect(guard).toBeGreaterThan(0);
		expect(load).toBeGreaterThan(guard);
	}
	expect(
		readFileSync(
			resolve(import.meta.dir, "../src/platform/clipboard.web.ts"),
			"utf8",
		),
	).toContain('from "expo-clipboard"');
});
