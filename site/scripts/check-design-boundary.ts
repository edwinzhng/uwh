import { resolve } from "node:path";
import ts from "typescript";

export const inspectDesignBoundary = (
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
	const fail = (node: ts.Node, message: string): void => {
		failures.push(
			`${filename}:${file.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${message}`,
		);
	};
	const inspect = (node: ts.Node): void => {
		if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
			const path = node.moduleSpecifier;
			if (
				path &&
				ts.isStringLiteral(path) &&
				(/^(next\/(image|link|script)|react-dom|react-native|@calgarycrocs\/design-system|@radix-ui\/|@base-ui\/|motion|framer-motion)/.test(
					path.text,
				) ||
					/\.css$/.test(path.text) ||
					/design-system\/(?!index$)/.test(path.text))
			)
				fail(
					node,
					"Import visual components through the site design-system entry point.",
				);
		}
		if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
			if (/^[a-z]/.test(node.tagName.getText(file)))
				fail(node, "Use a design-system component instead of raw markup.");
			for (const prop of node.attributes.properties) {
				if (ts.isJsxSpreadAttribute(prop))
					fail(prop, "Use explicit component props.");
				if (
					ts.isJsxAttribute(prop) &&
					/^(style|className|css|dangerouslySetInnerHTML|color|fontSize|fontFamily|padding|margin|as)$/.test(
						prop.name.getText(file),
					)
				)
					fail(
						prop,
						"Use a supported semantic variant instead of overriding presentation.",
					);
			}
		}
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			/^[A-Z]/.test(node.name.text) &&
			node.initializer &&
			ts.isStringLiteral(node.initializer)
		)
			fail(node, "Do not alias HTML tags as components.");
		if (
			ts.isCallExpression(node) &&
			/(^|\.)(createElement|createElementNS|write|insertAdjacentHTML|animate)$/.test(
				node.expression.getText(file),
			)
		)
			fail(
				node,
				"Keep DOM construction and animation inside the design system.",
			);
		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			/\.(innerHTML|outerHTML|cssText)$/.test(node.left.getText(file))
		)
			fail(node, "Do not inject markup or styles.");
		ts.forEachChild(node, inspect);
	};
	inspect(file);
	return failures;
};
if (import.meta.main) {
	const root = resolve(import.meta.dir, "..");
	const files = Array.from(
		new Bun.Glob("{app,src,components,lib}/**/*.{ts,tsx,js,jsx}").scanSync({
			cwd: root,
		}),
	);
	const failures = (
		await Promise.all(
			files.map(
				async (file): Promise<string[]> =>
					inspectDesignBoundary(
						await Bun.file(resolve(root, file)).text(),
						file,
					),
			),
		)
	).flat();
	if (failures.length) {
		console.error(failures.join("\n"));
		process.exitCode = 1;
	} else console.log(`Design boundary passed for ${files.length} files.`);
}
