import { expect, test } from "bun:test";
import ts from "typescript";

const controls = async (
	file: string,
	tags: string[],
): Promise<{ tag: string; attributes: Record<string, string> }[]> => {
	const path = `src/features/${file}.tsx`;
	const source = ts.createSourceFile(
		path,
		await Bun.file(path).text(),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const result: { tag: string; attributes: Record<string, string> }[] = [];
	const inspect = (node: ts.Node): void => {
		if (
			(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
			tags.includes(node.tagName.getText(source))
		) {
			result.push({
				tag: node.tagName.getText(source),
				attributes: Object.fromEntries(
					node.attributes.properties.flatMap((attribute) =>
						ts.isJsxAttribute(attribute)
							? [
									[
										attribute.name.getText(source),
										attribute.initializer?.getText(source) ?? "true",
									],
								]
							: [],
					),
				),
			});
		}
		ts.forEachChild(node, inspect);
	};
	inspect(source);
	return result;
};

test("event save state reaches registration options and their nested policies", async (): Promise<void> => {
	const editorOptions = await controls("event-editor", ["EventOptions"]);
	expect(editorOptions.at(0)?.attributes.busy).toBe("{busy || task.busy}");
	const options = await controls("event-options", [
		"Field",
		"Select",
		"TimeSelector",
		"EventEligibility",
		"ProgramRsvpFields",
	]);
	expect(options).toHaveLength(9);
	for (const { tag, attributes } of options) {
		const property =
			tag === "EventEligibility"
				? "busy"
				: tag === "ProgramRsvpFields"
					? "disabled"
					: "isDisabled";
		expect(attributes[property], tag).toBe("{busy}");
	}
});

test("eligibility controls and nested sheet remain disabled during event persistence", async (): Promise<void> => {
	const eligibility = await controls("event-eligibility", [
		"Select",
		"Button",
		"Field",
		"PersonChoice",
		"Dialog",
	]);
	expect(eligibility).toHaveLength(7);
	for (const { tag, attributes } of eligibility) {
		const property = tag === "Dialog" ? "isDismissDisabled" : "isDisabled";
		expect(attributes[property], tag).toMatch(
			/^\{busy(?: \|\| !matchingPlayers.length)?\}$/,
		);
	}
	const programFields = await controls("program-rsvp-fields", [
		"Field",
		"Select",
		"TimeSelector",
	]);
	expect(programFields).toHaveLength(6);
	for (const { attributes } of programFields)
		expect(attributes.isDisabled).toBe("{disabled}");
});
