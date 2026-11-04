import type { ReactElement } from "react";
import { Button } from "./button";
import type { IconName } from "./icon";
import type { RoleTone } from "./role-glow";

type Props = {
	label: string;
	icon: IconName;
	roleTone?: RoleTone;
	onPress: () => void;
	isDisabled?: boolean;
};

export const IconButton = ({
	label,
	icon,
	roleTone,
	onPress,
	isDisabled,
}: Props): ReactElement => (
	<Button
		label={label}
		icon={icon}
		roleTone={roleTone}
		onPress={onPress}
		isDisabled={isDisabled}
		variant="ghost"
	/>
);
