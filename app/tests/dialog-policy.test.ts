import { expect, test } from "bun:test";

test("dialogs expose no fullscreen path and do not invent a completion footer", async (): Promise<void> => {
	const [dialog, policy] = await Promise.all([
		Bun.file("src/design-system/dialog-content.tsx").text(),
		Bun.file("src/design-system/dialog-state.ts").text(),
	]);
	expect(dialog).not.toContain("fullscreen");
	expect(policy).not.toContain("fullscreen");
	expect(dialog).not.toContain("mobilePresentation");
	expect(dialog).not.toContain('label="Done"');
	expect(dialog).toContain(
		"paddingBottom: hasFooter ? space.md : bottomPadding",
	);
});

test("shared dismissal eligibility controls the header, drag and backdrop", async (): Promise<void> => {
	const dialog = await Bun.file("src/design-system/dialog-content.tsx").text();
	expect(dialog).toContain("isDisabled={!dismissAllowed}");
	expect(dialog).toContain("disabled={!dismissAllowed}");
	expect(dialog).toContain("enabled: isSheet && dismissAllowed");
	expect(dialog).toContain("onRequestClose={dismiss}");
	expect(dialog).toContain("onAccessibilityEscape={dismiss}");
});

test("dialog anatomy uses aligned breathing space instead of horizontal chrome dividers", async (): Promise<void> => {
	const dialog = await Bun.file("src/design-system/dialog-content.tsx").text();
	expect(dialog).not.toContain("borderBottomWidth");
	expect(dialog).not.toContain("borderTopWidth");
	expect(dialog).not.toContain("backdropFilter");
	expect(dialog).toContain("const contentInset = space.lg");
	expect(dialog).toContain("paddingTop: hideHeader ? space.md : space.sm");
	expect(dialog).toContain('<Text variant="h1">');
	expect(dialog).toContain("{hasFooter ? (");
	expect(dialog).toContain('<Row justify="end">{footer}</Row>');
});
