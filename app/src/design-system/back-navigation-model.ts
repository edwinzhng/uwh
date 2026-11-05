import type { ButtonProps } from "./button-props";

type BackNavigator = { canGoBack: () => boolean; back: () => void };

export const backNavigationButton = (
	props: ButtonProps,
	navigation?: BackNavigator,
): ButtonProps =>
	props.prefix === "arrowLeft" || props.icon === "arrowLeft"
		? {
				...props,
				prefix: undefined,
				leading: undefined,
				icon: "arrowLeft",
				onPress: navigation
					? (): void => {
							if (navigation.canGoBack()) navigation.back();
							else props.onPress();
						}
					: props.onPress,
				accessibilityLabel: navigation?.canGoBack()
					? "Back"
					: (props.accessibilityLabel ??
						(/^back\b/i.test(props.label)
							? props.label
							: `Back to ${props.label}`)),
			}
		: props;
