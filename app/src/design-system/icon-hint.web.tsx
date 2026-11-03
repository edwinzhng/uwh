import type { ReactElement } from "react";
import { IconHintContent, type IconHintProps } from "./icon-hint-content";

export const IconHint = (props: IconHintProps): ReactElement => (
	<span title={props.text}>
		<IconHintContent {...props} />
	</span>
);
