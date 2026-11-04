import type { ReactNode } from "react";
import type { ButtonVariant } from "./button-colors";
import type { IconName } from "./icon";
import type { RoleTone } from "./role-glow";

export type ButtonProps = {
	label: string;
	collapseLabelOnNarrow?: boolean;
	density?: "standard" | "filter";
	roleTone?: RoleTone;
	validationError?: string;
	onInvalid?: (message: string) => void;
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
	| { prefix?: IconName; icon?: undefined; leading?: undefined }
	| { icon: IconName; prefix?: undefined; leading?: undefined }
	| { leading: ReactNode; prefix?: undefined; icon?: undefined }
);
