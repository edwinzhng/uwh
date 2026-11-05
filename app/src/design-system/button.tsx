import { type ReactElement, useContext } from "react";
import { BackNavigationContext } from "./back-navigation";
import { BackNavigationButton } from "./back-navigation-button";
import { ButtonControl } from "./button-control";
import type { ButtonProps } from "./button-props";
import { ResponsiveButtonControl } from "./responsive-button-control";

export const Button = (props: ButtonProps): ReactElement => {
	const back = useContext(BackNavigationContext);
	if (back) return <BackNavigationButton {...props} />;
	return props.collapseLabelOnNarrow ? (
		<ResponsiveButtonControl {...props} />
	) : (
		<ButtonControl {...props} />
	);
};
