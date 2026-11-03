import type { ReactElement } from "react";
import { InteractionHighlight } from "./interaction-highlight";
import { corners } from "./tokens";

export const ToolbarHighlight = ({
	active,
}: {
	active: boolean;
}): ReactElement => (
	<InteractionHighlight
		active={active}
		color="#000000"
		radius={corners.pill}
		subtle
	/>
);
