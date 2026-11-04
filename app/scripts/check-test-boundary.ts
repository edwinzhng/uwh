import { resolve } from "node:path";
import ts from "typescript";

export const inspectTestBoundary = (
	source: string,
	filename: string,
): string[] => {
	const parsed = ts.createSourceFile(
		filename,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const failures: string[] = [];
	const hasSourceRead = /\b(Bun\.file|readFile(?:Sync)?)\s*\(/.test(source);
	const visit = (node: ts.Node): void => {
		if (
			ts.isCallExpression(node) &&
			/^(Bun\.file|(?:\w+\.)?readFile(?:Sync)?)$/.test(
				node.expression.getText(parsed),
			) &&
			node.arguments.some(
				(argument) =>
					/(?:src|convex|app)\//.test(argument.getText(parsed)) &&
					/\.(tsx?|jsx?)/.test(argument.getText(parsed)),
			)
		) {
			failures.push(
				`${filename}:${parsed.getLineAndCharacterOfPosition(node.getStart()).line + 1} Exercise imported behavior instead of reading product source.`,
			);
			return;
		}
		if (
			hasSourceRead &&
			(ts.isStringLiteral(node) ||
				ts.isNoSubstitutionTemplateLiteral(node) ||
				ts.isTemplateHead(node)) &&
			/(?:^|\/)(?:src|convex|app)\/.*\.(?:tsx?|jsx?)(?:$|["'])/.test(node.text)
		)
			failures.push(
				`${filename}:${parsed.getLineAndCharacterOfPosition(node.getStart()).line + 1} Import and exercise behavior; source structure belongs in a reusable lint rule.`,
			);
		ts.forEachChild(node, visit);
	};
	visit(parsed);
	return failures;
};
if (import.meta.main) {
	const root = resolve(import.meta.dir, "..");
	const files = Array.from(
		new Bun.Glob("{tests,scripts}/**/*.{test,spec}.{ts,tsx}").scanSync({
			cwd: root,
		}),
	);
	const failures = (
		await Promise.all(
			files.map(
				async (file): Promise<string[]> =>
					inspectTestBoundary(await Bun.file(resolve(root, file)).text(), file),
			),
		)
	).flat();
	if (failures.length) {
		console.error(failures.join("\n"));
		process.exitCode = 1;
	} else console.log(`Test boundary passed for ${files.length} files.`);
}
