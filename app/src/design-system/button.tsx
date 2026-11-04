import type { ReactElement } from "react";
import { ButtonControl } from "./button-control";
import type { ButtonProps } from "./button-props";
import { ResponsiveButtonControl } from "./responsive-button-control";

export const Button = (props: ButtonProps): ReactElement =>
	props.collapseLabelOnNarrow ? (
		<ResponsiveButtonControl {...props} />
	) : (
		<ButtonControl {...props} />
	);
