import { expect, test } from "bun:test";
import ts from "typescript";

const literalAttribute = (
	element: ts.JsxOpeningElement,
	name: string,
): string | undefined => {
	const attribute = element.attributes.properties.find(
		(property) =>
			ts.isJsxAttribute(property) && property.name.getText() === name,
	);
	return attribute &&
		ts.isJsxAttribute(attribute) &&
		attribute.initializer &&
		ts.isStringLiteral(attribute.initializer)
		? attribute.initializer.text
		: undefined;
};

test("dialog bodies do not repeat their literal title as a heading", async (): Promise<void> => {
	const duplicates: string[] = [];
	for await (const path of new Bun.Glob("src/features/**/*.tsx").scan(".")) {
		const source = ts.createSourceFile(
			path,
			await Bun.file(path).text(),
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX,
		);
		const visit = (node: ts.Node): void => {
			if (
				ts.isJsxElement(node) &&
				node.openingElement.tagName.getText() === "Dialog"
			) {
				const title = literalAttribute(node.openingElement, "title");
				const inspect = (child: ts.Node): void => {
					if (ts.isJsxElement(child)) {
						const tag = child.openingElement.tagName.getText();
						if (tag === "Dialog") return;
						const heading =
							tag === "SectionHeading" ||
							(tag === "Text" &&
								/^h[1-4]$/.test(
									literalAttribute(child.openingElement, "variant") ?? "",
								));
						const text = child.children
							.map((entry) => (ts.isJsxText(entry) ? entry.text : ""))
							.join("")
							.replace(/\s+/g, " ")
							.trim();
						if (title && heading && text === title)
							duplicates.push(`${path}: ${title}`);
					}
					ts.forEachChild(child, inspect);
				};
				for (const child of node.children) inspect(child);
			}
			ts.forEachChild(node, visit);
		};
		visit(source);
	}
	expect(duplicates).toEqual([]);
});

test("the schedule team preview leaves its title to the dialog and only renders the selected player's side", async (): Promise<void> => {
	const preview = await Bun.file(
		"src/features/event-preview-actions.tsx",
	).text();
	expect(preview).toContain('title="Lineup"');
	expect(preview).toContain("publishedEventLineups(");
	expect(preview).toContain("eventResponse(data, event.id, person.id)");
	expect(preview).toContain(
		"<TeamPool plan={plan} side={side} group={group} />",
	);
	expect(preview).not.toContain("SectionHeading");
	expect(preview).not.toContain("<TeamPanel");
});
