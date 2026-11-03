import { useAtomValue } from "jotai";
import {
	type ReactElement,
	type ReactNode,
	useContext,
	useId,
	useMemo,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
	activeLoadingScopeAtom,
	LoadingCoveredContext,
	LoadingScopeContext,
} from "./loading-state";
import { useTheme } from "./theme";
import { layer } from "./tokens";
import { useMotion } from "./use-motion";

export const LoadingScope = ({
	children,
	active = true,
}: {
	children: ReactNode;
	active?: boolean;
}): ReactElement => {
	const parent = useContext(LoadingScopeContext);
	const id = useId();
	const scope = useMemo(
		() => ({
			id,
			depth: (parent?.depth ?? -1) + 1,
			active: active && (parent?.active ?? true),
		}),
		[id, parent?.depth, parent?.active, active],
	);
	const selected = useAtomValue(activeLoadingScopeAtom);
	const covered = useContext(LoadingCoveredContext);
	const theme = useTheme();
	const animate = useMotion();
	return (
		<LoadingScopeContext value={scope}>
			{children}
			{selected === id && scope.active && !covered ? (
				<View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFill,
						{
							alignItems: "center",
							justifyContent: "center",
							zIndex: layer.modal,
						},
					]}
				>
					<ActivityIndicator
						accessibilityRole="progressbar"
						accessibilityLabel="Loading content"
						color={theme.text.secondary}
						animating={animate}
						hidesWhenStopped={false}
						size="small"
					/>
				</View>
			) : undefined}
		</LoadingScopeContext>
	);
};
