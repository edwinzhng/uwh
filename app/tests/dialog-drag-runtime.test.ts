import { expect, test } from "bun:test";
import ts from "typescript";

test("native sheet movement stays on the UI runtime and only dismissal commits to React", async (): Promise<void> => {
	const path = "src/design-system/use-dialog-drag.ts";
	const text = await Bun.file(path).text();
	const source = ts.createSourceFile(
		path,
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	expect(text).toContain("Gesture.Pan()");
	expect(text).toContain(".manualActivation(true)");
	expect(text).not.toContain("PanResponder");
	expect(text).not.toContain("runOnJS");
	const updateCallbacks: string[] = [];
	const inspect = (node: ts.Node): void => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === "onUpdate"
		)
			updateCallbacks.push(node.arguments.at(0)?.getText(source) ?? "");
		ts.forEachChild(node, inspect);
	};
	inspect(source);
	expect(updateCallbacks).toHaveLength(1);
	expect(updateCallbacks.at(0)).toContain("offset.set");
	expect(updateCallbacks.at(0)).not.toContain("scheduleOnRN");
	expect(text.match(/scheduleOnRN\(commitDismiss\)/g)).toHaveLength(1);
});

test("native modal headers have a gesture root and web retains its isolated responder", async (): Promise<void> => {
	const [dialog, root, web] = await Promise.all([
		Bun.file("src/design-system/dialog-content.tsx").text(),
		Bun.file("src/design-system/dialog-gesture-root.tsx").text(),
		Bun.file("src/design-system/use-dialog-drag.web.ts").text(),
	]);
	expect(dialog).toContain("<DialogGestureRoot>");
	expect(dialog).toContain("<DialogDragSurface gesture={gesture}>");
	expect(root).toContain("GestureHandlerRootView");
	expect(web).toContain("PanResponder.create");
});
