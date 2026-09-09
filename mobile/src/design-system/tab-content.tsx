import { type ReactElement, type ReactNode, useState } from "react";
import { PageReveal } from "./page-reveal";

export const TabContent = ({
	value,
	children,
}: {
	value: string;
	children: ReactNode;
}): ReactElement => {
	const [selection, setSelection] = useState({ value, changed: false });
	if (selection.value !== value) setSelection({ value, changed: true });
	return (
		<PageReveal key={value} enabled={selection.changed} replayOnFocus={false}>
			{children}
		</PageReveal>
	);
};
