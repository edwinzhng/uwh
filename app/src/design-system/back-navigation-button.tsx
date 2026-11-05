import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { backNavigationButton } from "./back-navigation-model";
import { ButtonControl } from "./button-control";
import type { ButtonProps } from "./button-props";

export const BackNavigationButton = (props: ButtonProps): ReactElement => {
	const router = useRouter();
	return <ButtonControl {...backNavigationButton(props, router)} />;
};
