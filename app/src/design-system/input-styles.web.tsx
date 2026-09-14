import type { ReactElement } from "react";

export const InputStyles = (): ReactElement => (
	<style>{`
@media (max-width: 900px), (pointer: coarse) {
 input, textarea, select, [contenteditable="true"] {
  font-size: max(16px, 1em) !important;
 }
}
`}</style>
);
