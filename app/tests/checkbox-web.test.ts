import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Checkbox } from "../src/design-system/checkbox.web";

test("web checkboxes render a labeled native input with browser keyboard semantics", (): void => {
	const markup = renderToStaticMarkup(
		createElement(Checkbox, {
			label: "Passing under pressure",
			checked: false,
			onChange: (): void => {},
		}),
	);
	expect(markup).toMatch(/^<label[^>]*><input type="checkbox"/);
	expect(markup).toContain("<span>Passing under pressure</span></label>");
	expect(markup).not.toContain('checked=""');
	expect(markup).toContain("min-height:44px");
	expect(markup).toContain("padding:8px 12px");
	expect(markup).toContain("margin-inline:0");
	expect(markup).toContain('class="club-checkbox-row"');
});

test("web checkboxes reflect the controlled selected state in the native input", (): void => {
	const markup = renderToStaticMarkup(
		createElement(Checkbox, {
			label: "Support positioning",
			checked: true,
			onChange: (): void => {},
		}),
	);
	expect(markup).toMatch(/<input type="checkbox"[^>]*checked=""/);
	expect(markup).not.toContain('role="button"');
});
test("disabled web checkboxes expose native disabled semantics", (): void => {
	const markup = renderToStaticMarkup(
		createElement(Checkbox, {
			label: "Saving roster",
			checked: true,
			isDisabled: true,
			onChange: (): void => {},
		}),
	);
	expect(markup).toMatch(/<input[^>]*disabled=""/);
});
