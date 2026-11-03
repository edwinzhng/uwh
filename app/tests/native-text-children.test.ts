import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

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

const invalidTextChildren = (source: string, filename: string): string[] => {
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

test("native layout rejects literal text including spaces hidden in fragments", (): void => {
	expect(
		invalidTextChildren('const face = <>{" "}<Icon />{" "}</>;', "fixture.tsx"),
	).toHaveLength(2);
	expect(
		invalidTextChildren("const face = <View>oops{0}</View>;", "fixture.tsx"),
	).toHaveLength(2);
	expect(
		invalidTextChildren(
			'const face = <View><Text>Words{" "}<>{"more"}</></Text></View>;',
			"fixture.tsx",
		),
	).toEqual([]);
});

test("app native layouts contain no literal text outside text components", (): void => {
	const files = [
		...new Bun.Glob("{src,app}/**/*.tsx").scanSync({
			cwd: resolve(import.meta.dir, ".."),
			absolute: true,
		}),
	].filter((file) => !file.endsWith(".web.tsx"));
	expect(
		files.flatMap((file) =>
			invalidTextChildren(readFileSync(file, "utf8"), file),
		),
	).toEqual([]);
});
