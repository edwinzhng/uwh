import type { ReactElement, ReactNode } from "react";
import { useReduceTransparency } from "./material-accessibility";
import { space } from "./tokens";

export const MessageViewport = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const opaque = useReduceTransparency();
	const mask = opaque
		? undefined
		: `linear-gradient(to bottom, transparent, black ${space.sm}px, black calc(100% - ${space.sm}px), transparent)`;
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				flex: 1,
				minHeight: 0,
				maskImage: mask,
				WebkitMaskImage: mask,
			}}
		>
			{children}
		</div>
	);
};
