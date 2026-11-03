import type { ReactElement } from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ToastCard } from "./toast-card";
import type { ToastViewProps } from "./toast-lifetime";
import { ToastSwipe } from "./toast-swipe";
import { space } from "./tokens";

const ActionToastView = (props: ToastViewProps): ReactElement => {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	return (
		<ToastSwipe onDismiss={props.onExpire}>
			<View
				style={{
					width: Math.min(
						356,
						width - insets.left - insets.right - space.md * 2,
					),
				}}
			>
				<ToastCard
					copy={props.copy}
					kind={props.kind}
					startedAt={props.startedAt}
					duration={props.duration}
					onExpire={props.onExpire}
				/>
			</View>
		</ToastSwipe>
	);
};
export const renderActionToast = (props: ToastViewProps): ReactElement => (
	<ActionToastView
		copy={props.copy}
		kind={props.kind}
		startedAt={props.startedAt}
		duration={props.duration}
		onExpire={props.onExpire}
	/>
);
