import { existsSync } from "node:fs";
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

export const optionalNativePackage = (name: string): boolean =>
	[...optionalPackages].some(
		(optional) => name === optional || name.startsWith(`${optional}/`),
	);

export const runtimeImports = (source: string, filename: string): string[] => {
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

export const eagerBrowserOperations = (
	source: string,
	filename: string,
): string[] => {
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

export const duplicateSiblingKeys = (
	source: string,
	filename: string,
): string[] => {
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

const layoutTags = new Set([
	"View",
	"Animated.View",
	"Pressable",
	"ScrollView",
	"KeyboardAvoidingView",
	"Stack",
	"Row",
	"Grid",
	"Surface",
]);
const textTags = new Set([
	"Text",
	"NativeText",
	"Animated.Text",
	"SectionHeading",
]);

export const invalidTextChildren = (
	source: string,
	filename: string,
): string[] => {
	const file = ts.createSourceFile(
		filename,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const failures: string[] = [];
	const visit = (node: ts.Node, insideText: boolean): void => {
		const tag = ts.isJsxElement(node)
			? node.openingElement.tagName.getText(file)
			: undefined;
		const textContext = tag ? textTags.has(tag) : insideText;
		if (
			!textContext &&
			(ts.isJsxFragment(node) || (tag && layoutTags.has(tag))) &&
			(ts.isJsxElement(node) || ts.isJsxFragment(node))
		) {
			for (const child of node.children) {
				const literal = ts.isJsxText(child)
					? child.text.trim() || undefined
					: ts.isJsxExpression(child) &&
							child.expression &&
							(ts.isStringLiteral(child.expression) ||
								ts.isNumericLiteral(child.expression))
						? child.expression.text
						: undefined;
				if (literal !== undefined && literal !== "")
					failures.push(
						`${filename}:${file.getLineAndCharacterOfPosition(child.pos).line + 1}`,
					);
			}
		}
		ts.forEachChild(node, (child): void => visit(child, textContext));
	};
	visit(file, false);
	return failures;
};

if (import.meta.main) {
	const root = resolve(import.meta.dir, "..");
	const sources = new Map(
		await Promise.all(
			Array.from(
				new Bun.Glob("{src,app}/**/*.{ts,tsx}").scanSync({
					cwd: root,
					absolute: true,
				}),
			).map(
				async (filename): Promise<readonly [string, string]> => [
					filename,
					await Bun.file(filename).text(),
				],
			),
		),
	);
	const failures = Array.from(sources).flatMap(([filename, source]) => [
		...duplicateSiblingKeys(source, filename),
		...(filename.endsWith(".tsx") && !filename.endsWith(".web.tsx")
			? invalidTextChildren(source, filename)
			: []),
		...source
			.split("\n")
			.flatMap((line, index) =>
				/\.(toSorted|toReversed|toSpliced|findLast|findLastIndex)\s*\(|Object\.hasOwn\s*\(|URL\.(canParse|parse)\s*\(/.test(
					line,
				)
					? [
							filename +
								":" +
								(index + 1) +
								" unsupported native runtime method",
						]
					: [],
			),
	]);
	const inspected = new Map<string, { imports: string[]; eager: string[] }>();
	for (const platform of ["ios", "android"]) {
		const queue = Array.from(sources.keys()).filter((filename) =>
			filename.includes("/app/app/"),
		);
		const visited = new Set<string>();
		for (const filename of queue) {
			if (visited.has(filename)) continue;
			visited.add(filename);
			const source = sources.get(filename) ?? "";
			const result = inspected.get(filename) ?? {
				imports: runtimeImports(source, filename),
				eager: eagerBrowserOperations(source, filename),
			};
			inspected.set(filename, result);
			failures.push(
				...result.eager.map((name) => `${filename}: eager ${name}`),
			);
			for (const name of result.imports) {
				if (
					optionalNativePackage(name) ||
					name.endsWith("/resource-media-fixtures")
				)
					failures.push(`${filename}: defer optional feature import ${name}`);
				if (name.startsWith(".")) {
					const next = nativeModulePath(
						resolve(dirname(filename), name),
						platform,
					);
					if (next) queue.push(next);
				}
			}
		}
	}
	if (failures.length) {
		console.error(Array.from(new Set(failures)).join("\n"));
		process.exitCode = 1;
	} else console.log(`Native safety passed for ${sources.size} files.`);
}
