import ts from "typescript";
export const inspectInteractionBoundary = (
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
	const visit = (node: ts.Node): void => {
		if (
			filename.endsWith("message-timeline.tsx") &&
			(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
			["HeaderBackdrop", "ScrollEdgeBackdrop", "BlurView"].includes(
				node.tagName.getText(file),
			)
		)
			fail(
				node,
				"Chat fading belongs to MessageViewport; do not layer navigation blur over message edges.",
			);
		if (
			ts.isJsxAttribute(node) &&
			node.name.getText(file) === "onValueChange" &&
			node.initializer &&
			/\brouter\.(setParams|replace)\s*\(/.test(node.initializer.getText(file))
		)
			fail(
				node,
				"Use useRouteSelection for URL-backed controls so content updates immediately before route synchronization.",
			);
		if (
			ts.isJsxAttribute(node) &&
			node.name.getText(file) === "key" &&
			node.initializer &&
			/\b(partId|selectedPart|activeTab)\b/.test(
				node.initializer.getText(file),
			) &&
			node.parent.parent.getText(file).startsWith("<SessionPeople")
		)
			fail(
				node,
				"Attendance part filters must update props without remounting the roster and its pending work.",
			);
		if (
			filename.endsWith("tab-content.tsx") &&
			ts.isJsxAttribute(node) &&
			["key", "contentKey"].includes(node.name.getText(file)) &&
			node.initializer &&
			/\bvalue\b/.test(node.initializer.getText(file))
		)
			fail(
				node,
				"Tab selection must not remount or hide the shared content boundary.",
			);
		if (
			filename.endsWith("use-control-selection.ts") &&
			ts.isCallExpression(node) &&
			/startTransition|setTimeout|requestAnimationFrame/.test(
				node.expression.getText(file),
			)
		)
			fail(
				node,
				"Shared controls must notify selection synchronously; defer only route synchronization in useRouteSelection.",
			);
		ts.forEachChild(node, visit);
	};
	visit(file);
	return failures;
};
