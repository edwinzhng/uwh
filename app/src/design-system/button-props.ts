import type { ReactNode } from "react";
import type { ButtonVariant } from "./button-colors";
import type { IconName } from "./icon";
import type { RoleTone } from "./role-glow";

export type ButtonProps = {
	label: string;
	density?: "standard" | "filter";
	roleTone?: RoleTone;
	validationError?: string;
	onInvalid?: (message: string) => void;
	leading?: ReactNode;
	accessibilityLabel?: string;
	onPress: () => void;
	variant?: ButtonVariant;
	isDisabled?: boolean;
	isLoading?: boolean;
	isSelected?: boolean;
	testID?: string;
	compact?: boolean;
	round?: boolean;
} & (
	| { prefix?: IconName; icon?: undefined }
	| { icon: IconName; prefix?: undefined }
);
