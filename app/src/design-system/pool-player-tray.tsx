import {
	type ReactElement,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import {
	Pressable,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { LineupPlayerPortrait } from "./lineup-player-portrait";
import { PoolBoardContext } from "./pool-board-context";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

type Player = {
	id: string;
	name: string;
	displayName?: string;
	assigned: boolean;
};
const TrayPlayer = ({
	player,
	scope,
	selected,
	onSelect,
	disabled,
}: {
	player: Player;
	scope: string;
	selected: boolean;
	onSelect: (id: string) => void;
	disabled: boolean;
}): ReactElement => {
	const theme = useTheme();
	const board = useContext(PoolBoardContext);
	const drag = board?.drag;
	const [focused, setFocused] = useState(false);
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	const finish = useCallback(
		async (left: number, top: number): Promise<void> => {
			try {
				await board?.drop(player.id, left, top);
			} finally {
				x.set(0);
				y.set(0);
				board?.drag.set(undefined);
			}
		},
		[board, player.id, x, y],
	);
	const gesture = useMemo(
		() =>
			Gesture.Pan()
				.enabled(!disabled && !player.assigned && Boolean(board))
				.minDistance(6)
				.maxPointers(1)
				.onStart((event): void => {
					drag?.set({
						personId: player.id,
						scope,
						x: event.absoluteX,
						y: event.absoluteY,
					});
				})
				.onUpdate((event): void => {
					x.set(event.translationX);
					y.set(event.translationY);
					drag?.set({
						personId: player.id,
						scope,
						x: event.absoluteX,
						y: event.absoluteY,
					});
				})
				.onEnd((event): void => {
					scheduleOnRN(finish, event.absoluteX, event.absoluteY);
				})
				.onFinalize((_event, success): void => {
					if (!success) {
						x.set(0);
						y.set(0);
						drag?.set(undefined);
					}
				}),
		[board, drag, disabled, player.id, player.assigned, scope, x, y, finish],
	);
	const animated = useAnimatedStyle(() => ({
		transform: [{ translateX: x.get() }, { translateY: y.get() }],
		zIndex: x.get() || y.get() ? 100 : 0,
	}));
	return (
		<GestureDetector gesture={gesture} touchAction="none">
			<Animated.View style={animated}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${player.name}${player.assigned ? ", already on lineup" : ", select to place"}`}
					accessibilityState={{
						disabled: disabled || player.assigned,
						selected,
					}}
					disabled={disabled || player.assigned}
					onPress={(): void => onSelect(player.id)}
					onFocus={(): void => setFocused(true)}
					onBlur={(): void => setFocused(false)}
					style={{
						alignItems: "center",
						justifyContent: "center",
						opacity: player.assigned ? 0.4 : 1,
						borderRadius: corners.control,
						borderWidth: geometry.border,
						borderColor: selected ? theme.focus : theme.border,
						outlineWidth: focused ? geometry.focus : 0,
						outlineColor: theme.focus,
						padding: space.xxs,
						minWidth: geometry.touch + space.sm,
					}}
				>
					<LineupPlayerPortrait
						name={player.name}
						personId={player.id}
						displayName={player.displayName}
					/>
				</Pressable>
			</Animated.View>
		</GestureDetector>
	);
};
export const PoolPlayerTray = ({
	players,
	scope,
	selectedPersonId,
	onSelect,
	disabled,
}: {
	players: Player[];
	scope: string;
	selectedPersonId?: string;
	onSelect: (id: string) => void;
	disabled: boolean;
}): ReactElement | undefined => {
	const { width } = useWindowDimensions();
	const theme = useTheme();
	if (width < geometry.wide) return undefined;
	return (
		<View
			style={{
				backgroundColor: theme.background.card,
				flexGrow: 1,
				flexShrink: 1,
				minHeight: geometry.touch * 3,
				borderTopWidth: geometry.border,
				borderColor: theme.border,
				padding: space.sm,
				gap: space.xs,
				zIndex: 5,
			}}
		>
			<Text
				style={{
					...typography.small,
					fontFamily: font.semibold,
					color: theme.text.primary,
				}}
			>
				Players · {players.filter((player) => !player.assigned).length}{" "}
				available
			</Text>
			<ScrollView
				style={{ flex: 1, minHeight: 0 }}
				showsVerticalScrollIndicator
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					flexDirection: "row",
					flexWrap: "wrap",
					alignContent: "flex-start",
					gap: space.xs,
					paddingBottom: space.xxs,
				}}
			>
				{players.map((player) => (
					<TrayPlayer
						key={player.id}
						player={player}
						scope={scope}
						selected={selectedPersonId === player.id}
						onSelect={onSelect}
						disabled={disabled}
					/>
				))}
			</ScrollView>
			<Text
				style={{
					...typography.navigation,
					fontFamily: font.regular,
					color: theme.text.secondary,
				}}
			>
				Drag an available player to a position, or select one and use a
				position’s add button.
			</Text>
		</View>
	);
};
