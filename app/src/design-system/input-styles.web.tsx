import type { ReactElement } from "react";

export const InputStyles = (): ReactElement => (
	<style>{`
html { -webkit-tap-highlight-color:transparent; -webkit-text-size-adjust:100%; overscroll-behavior:none; }
body { overscroll-behavior:none; }
button, a, [role="button"], [role="tab"], [role="menuitem"] { touch-action:manipulation; -webkit-user-select:none; user-select:none; -webkit-touch-callout:none; }
@media (max-width: 900px), (pointer: coarse) {
 input, textarea, select, [contenteditable="true"] {
  font-size: max(16px, 1em) !important;
 }
}
`}</style>
);
