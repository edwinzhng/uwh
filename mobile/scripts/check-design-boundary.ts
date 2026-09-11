import { resolve } from "node:path";
import ts from "typescript";

const visualImports =
	/^(motion($|\/)|framer-motion($|\/)|@paper-design\/|sonner($|\/|-)|react-native($|\/|-)|react-day-picker($|\/)|@react-native-community\/|@rn-primitives\/|@base-ui\/|@radix-ui\/|lucide-|.*\.css$)/;
const visualProps = new Set([
	"style",
	"animationDuration",
	"transitionDuration",
	"entering",
	"exiting",
	"layout",
	"className",
	"css",
	"color",
	"backgroundColor",
	"fontSize",
	"fontFamily",
	"fontWeight",
	"lineHeight",
	"letterSpacing",
	"textTransform",
	"fontScale",
	"borderRadius",
	"zIndex",
	"boxShadow",
	"margin",
	"paddingHorizontal",
	"paddingVertical",
	"dangerouslySetInnerHTML",
]);

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
	const fail = (node: ts.Node, reason: string): void => {
		failures.push(
			`${filename}:${file.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${reason}`,
		);
	};
	const inspect = (node: ts.Node): void => {
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			const name = node.moduleSpecifier.text;
			const nativeServicesOnly =
				name === "react-native" &&
				ts.isImportDeclaration(node) &&
				node.importClause?.namedBindings &&
				ts.isNamedImports(node.importClause.namedBindings) &&
				!node.importClause.name &&
				node.importClause.namedBindings.elements.every((entry) =>
					["AppState", "Linking", "Platform"].includes(
						(entry.propertyName ?? entry.name).text,
					),
				);
			if (visualImports.test(name) && !nativeServicesOnly)
				fail(
					node,
					"Import visual primitives through the public design system.",
				);
			if (/design-system\/.+/.test(name) && !/design-system\/index$/.test(name))
				fail(node, "Use the public design-system entry point.");
		}
		if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
			if (
				/breadcrumb/i.test(filename) &&
				["Text", "Button", "Row"].includes(node.tagName.getText(file))
			)
				fail(
					node,
					"Use Breadcrumbs so navigation labels share the small typography token.",
				);
			if (ts.isIdentifier(node.tagName) && /^[a-z]/.test(node.tagName.text))
				fail(node, "Raw HTML is not allowed in product code.");
			for (const attribute of node.attributes.properties) {
				if (
					ts.isJsxAttribute(attribute) &&
					attribute.name.getText(file) === "isDisabled" &&
					["Button", "ConfirmButton"].includes(node.tagName.getText(file)) &&
					attribute.initializer &&
					/trim\(|\b(valid|canSave|canSubmit|amount|password|confirmed|email|code|body|draft)\b/.test(
						attribute.initializer.getText(file),
					)
				)
					fail(
						attribute,
						"Keep form submissions enabled; use validationError for input validation.",
					);
				if (ts.isJsxSpreadAttribute(attribute))
					fail(attribute, "Explicit props keep the component API constrained.");
				if (
					ts.isJsxAttribute(attribute) &&
					visualProps.has(attribute.name.getText(file))
				)
					fail(
						attribute,
						"Choose a supported variant or token instead of a style override.",
					);
			}
		}
		if (
			ts.isCallExpression(node) &&
			/(^|\.)createElement$/.test(node.expression.getText(file))
		)
			fail(node, "Compose the UI with declarative design-system JSX.");
		if (
			ts.isCallExpression(node) &&
			/^(document\.(createElement|write)|.*\.(insertAdjacentHTML|animate))$/.test(
				node.expression.getText(file),
			)
		)
			fail(
				node,
				"Keep DOM and animation implementation inside the design system.",
			);
		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			/\.(innerHTML|outerHTML|cssText)$/.test(node.left.getText(file))
		)
			fail(node, "Do not inject HTML or CSS from product code.");
		ts.forEachChild(node, inspect);
	};
	inspect(file);
	return failures;
};

if (import.meta.main) {
	const root = resolve(import.meta.dir, "..");
	const files = Array.from(
		new Bun.Glob("{app,src}/**/*.{ts,tsx}").scanSync({ cwd: root }),
	).filter((file) => !file.startsWith("src/design-system/"));
	const results = await Promise.all(
		files.map(
			async (file): Promise<string[]> =>
				inspectDesignBoundary(await Bun.file(resolve(root, file)).text(), file),
		),
	);
	const failures = results.flat();
	if (failures.length) {
		console.error(failures.join("\n"));
		process.exitCode = 1;
	} else console.log(`Design boundary passed for ${files.length} files.`);
}
