import type { ReactElement } from "react";
import { Button } from "./button";
import type { IconName } from "./icon";

type Props = {
	label: string;
	icon: IconName;
	onPress: () => void;
	isDisabled?: boolean;
};

export const IconButton = ({
	label,
	icon,
	onPress,
	isDisabled,
}: Props): ReactElement => (
	<Button
		label={label}
		icon={icon}
		onPress={onPress}
		isDisabled={isDisabled}
		variant="ghost"
	/>
);
