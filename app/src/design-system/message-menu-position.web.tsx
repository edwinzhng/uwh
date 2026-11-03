import type { ReactElement, ReactNode } from "react";
import { messageMenuOffset } from "./message-bubble-layout";
import { geometry } from "./tokens";

export const MessageMenuPosition = ({
	children,
	outgoing,
	separate,
}: {
	children: ReactNode;
	outgoing: boolean;
	separate: boolean;
}): ReactElement => (
	<div
		className="club-message-menu-position"
		data-separate={separate || undefined}
		style={{
			position: "absolute",
			pointerEvents: "none",
			top: 0,
			left: outgoing ? messageMenuOffset(separate) : undefined,
			right: outgoing ? undefined : messageMenuOffset(separate),
			width: geometry.touch,
			height: geometry.touch,
		}}
	>
		{children}
	</div>
);
