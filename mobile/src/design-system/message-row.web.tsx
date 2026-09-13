import type { ReactElement, ReactNode } from "react";
import { space } from "./tokens";
export const MessageRow = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => (
	<div
		className="club-message-row"
		style={{ paddingInline: space.md, paddingBlock: space.xs }}
	>
		{children}
	</div>
);
