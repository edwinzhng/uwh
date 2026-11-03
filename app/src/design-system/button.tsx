import type { ReactElement } from "react";
import { ButtonControl } from "./button-control";
import type { ButtonProps } from "./button-props";

export const Button = (props: ButtonProps): ReactElement => (
	<ButtonControl {...props} />
);
