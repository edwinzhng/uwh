import type { ReactElement } from "react";
import { useWindowDimensions } from "react-native";
import { ButtonControl } from "./button-control";
import type { ButtonProps } from "./button-props";

export const ResponsiveButtonControl = ({
	icon,
	prefix,
	...props
}: ButtonProps): ReactElement => {
	const { width } = useWindowDimensions();
	const glyph = icon ?? prefix;
	return width < 360 && glyph ? (
		<ButtonControl {...props} icon={glyph} />
	) : icon ? (
		<ButtonControl {...props} icon={icon} />
	) : (
		<ButtonControl {...props} prefix={prefix} />
	);
};
