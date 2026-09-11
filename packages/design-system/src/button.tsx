import type { ComponentProps, ReactElement } from "react";
import { brand, radius } from "./tokens";

export const Button = ({
	style,
	type = "button",
	...props
}: ComponentProps<"button">): ReactElement => (
	<button
		{...props}
		type={type}
		style={{
			borderRadius: radius.xs,
			backgroundColor: brand.accent,
			color: brand.surface,
			border: 0,
			...style,
		}}
	/>
);
