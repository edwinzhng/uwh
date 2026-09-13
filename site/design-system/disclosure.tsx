import type { ReactElement, ReactNode } from "react";
export const Disclosure = ({
	label,
	children,
}: {
	label: ReactNode;
	children: ReactNode;
}): ReactElement => (
	<details className="practice-notes">
		<summary>{label}</summary>
		{children}
	</details>
);
