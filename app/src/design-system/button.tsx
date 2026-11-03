import type { ReactElement } from "react";
import { ButtonControl } from "./button-control";
import { raisedButton } from "./button-feedback";
import type { ButtonProps } from "./button-props";
import { RaisedButton } from "./raised-button";

export const Button = (props: ButtonProps): ReactElement =>
	raisedButton(props.variant ?? "solid") ? (
		<RaisedButton {...props} />
	) : (
		<ButtonControl {...props} />
	);
