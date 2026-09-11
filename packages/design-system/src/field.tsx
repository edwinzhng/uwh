import type { ComponentProps, ReactElement } from "react";
import { radius } from "./tokens";

export const Field = ({
	style,
	...props
}: ComponentProps<"input">): ReactElement => (
	<input {...props} style={{ borderRadius: radius.xs, ...style }} />
);
