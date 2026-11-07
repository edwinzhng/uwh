import {
	type ReactElement,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useId,
	useRef,
} from "react";
import { type LayoutChangeEvent, Text, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { PoolBoardContext } from "./pool-board-context";
import {
	type PoolBoardDrag,
	type PoolRowFrame,
	poolBoardDropAction,
	poolBoardSpotAt,
} from "./pool-board-layout";
import { PoolPiece } from "./pool-board-piece";
import { type PoolTarget, PoolTargetsContext } from "./pool-drop-target";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

export type PoolBoardPerson = {
	id: string;
	name: string;
	captain?: boolean;
	displayName?: string;
	substitute?: boolean;
};
export type PoolBoardSpot = {
	id: string;
	label: string;
	shortLabel?: string;
	addOptions?: readonly { id: string; label: string; onSelect: () => void }[];
	person?: PoolBoardPerson;
	substitutes?: PoolBoardPerson[];
};
type Props = {
	label: string;
	side?: "black" | "white";
	headerAction?: ReactNode;
	detail?: ReactNode;
	summary?: ReactNode;
	dragScope?: string;
	rows: PoolBoardSpot[][];
	selectedPersonId?: string;
	onPlace?: (personId: string, spotId: string) => void;
	onAdd?: (personId: string, spotId: string) => void;
	onSwap?: (personId: string, otherId: string) => void;
	onManageRotation?: (spotId: string, label: string) => void;
};
const rowHeight =
	geometry.touch + space.xs * 2 + typography.navigation.lineHeight * 2;
const PoolRow = ({
	row,
	inset,
	drag,
	onLayout,
	children,
}: {
	row: PoolBoardSpot[];
	inset: number;
	drag: SharedValue<PoolBoardDrag | undefined>;
	onLayout: (event: LayoutChangeEvent) => void;
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	const personIds = row.flatMap((spot) => [
		...(spot.person ? [spot.person.id] : []),
		...(spot.substitutes ?? []).map((person) => person.id),
	]);
	const activeStyle = useAnimatedStyle(() => ({
		zIndex: personIds.some((id) => id === drag.get()?.personId) ? 2 : 1,
	}));
	return (
		<Animated.View
			onLayout={onLayout}
			style={[
				{
					minHeight: rowHeight,
					paddingVertical: space.xxs,
					paddingHorizontal: `${inset * 100}%`,
					flexDirection: "row",
					alignItems: "stretch",
					flexGrow: 1,
					gap: space.xxs,
					borderTopWidth: 0,
					borderTopColor: theme.border,
				},
				activeStyle,
			]}
		>
			{children}
		</Animated.View>
	);
};
export const PoolBoard = ({
	label,
	headerAction,
	detail,
	summary,
	side = "white",
	dragScope = "default",
	rows,
	selectedPersonId,
	onPlace,
	onAdd,
	onSwap,
	onManageRotation,
}: Props): ReactElement => {
	const theme = useTheme();
	const targets = useRef(new Map<string, PoolTarget>());
	const register = useCallback(
		(id: string, target: PoolTarget): (() => void) => {
			targets.current.set(id, target);
			return (): void => {
				if (targets.current.get(id) === target) targets.current.delete(id);
			};
		},
		[],
	);
	const board = useRef<View>(null);
	const rowFrames = useRef(new Map<number, PoolRowFrame>());
	const boards = useContext(PoolBoardContext);
	const localDrag = useSharedValue<PoolBoardDrag | undefined>(undefined);
	const drag = boards?.drag ?? localDrag;
	const personIds = [
		...rows.flatMap((row) =>
			row.flatMap((spot) => [
				...(spot.person ? [spot.person.id] : []),
				...(spot.substitutes ?? []).map((person) => person.id),
			]),
		),
	];
	const activeStyle = useAnimatedStyle(() => ({
		zIndex: personIds.some((id) => id === drag.get()?.personId) ? 2 : 1,
	}));
	const id = useId();
	const drop = (personId: string, x: number, y: number): Promise<void> =>
		new Promise((resolve) => {
			if (!board.current) {
				resolve();
				return;
			}
			board.current.measureInWindow((left, top, width, height): void => {
				const localX = x - left;
				const localY = y - top;
				if (localX < 0 || localX > width || localY < 0 || localY > height) {
					resolve();
					return;
				}
				const spot = poolBoardSpotAt(
					rows,
					rowFrames.current,
					width,
					localX,
					localY,
					0,
				);
				if (!spot) {
					resolve();
					return;
				}
				void Promise.all(
					Array.from(targets.current.values())
						.filter((target) => target.slotId === spot.id)
						.map(async (target) => ({ target, bounds: await target.bounds() })),
				).then((candidates): void => {
					const action = poolBoardDropAction(
						candidates.map(({ target, bounds }) => ({ ...target, bounds })),
						x,
						y,
						personId,
						spot.id,
					);
					if (spot.addOptions?.some((option) => option.id === personId))
						onAdd?.(personId, spot.id);
					else if (action?.kind === "swap") onSwap?.(personId, action.personId);
					else if (action) (onAdd ?? onPlace)?.(personId, action.slotId);
					resolve();
				});
			});
		});
	useEffect(() => {
		if (!boards || !onPlace) return;
		boards.register(id, drop);
		return (): void => boards.unregister(id);
	});
	const dispatchDrop = boards?.drop ?? drop;
	const press = (spot: PoolBoardSpot): (() => void) | undefined =>
		selectedPersonId &&
		onAdd &&
		spot.addOptions?.some((option) => option.id === selectedPersonId)
			? (): void => onAdd(selectedPersonId, spot.id)
			: !spot.person && onManageRotation
				? (): void => onManageRotation(spot.id, spot.label)
				: undefined;
	return (
		<PoolTargetsContext value={register}>
			<Animated.View style={[{ gap: space.xs, flexGrow: 1 }, activeStyle]}>
				<View
					style={{
						gap: space.sm,
						padding: space.xxs,
						borderRadius: corners.panel,
						backgroundColor: "transparent",
					}}
				>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							gap: space.xs,
							flexWrap: "wrap",
						}}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: space.xs,
							}}
						>
							<Text
								style={{
									...typography.label,
									fontFamily: font.semibold,
									color: side === "black" ? "#EEF2D9" : "#101710",
									backgroundColor: side === "black" ? "#101710" : "#EEF2D9",
									paddingHorizontal: space.xs,
									paddingVertical: space.xxs,
									borderRadius: corners.control,
									overflow: "hidden",
								}}
							>
								{label}
							</Text>
							{detail}
						</View>
						{headerAction ? (
							<View style={{ maxWidth: "100%", minWidth: 0, flexShrink: 1 }}>
								{headerAction}
							</View>
						) : undefined}
					</View>
				</View>
				<View
					ref={board}
					collapsable={false}
					style={{
						flexGrow: 1,
						borderWidth: 0,
						borderColor: theme.border,
						borderRadius: corners.panel,
						backgroundColor: "transparent",
					}}
				>
					{rows.map((row, index) => (
						<PoolRow
							key={row.map((spot) => spot.id).join(":")}
							row={row}
							inset={0}
							drag={drag}
							onLayout={({ nativeEvent: { layout } }): void => {
								rowFrames.current.set(index, {
									y: layout.y,
									height: layout.height,
								});
							}}
						>
							{row.map((spot) => (
								<PoolPiece
									key={spot.id}
									spot={spot}
									selectedPersonId={selectedPersonId}
									dragState={drag}
									scope={dragScope}
									selected={
										selectedPersonId !== undefined &&
										selectedPersonId === spot.person?.id
									}
									onPress={press(spot)}
									onDrop={onPlace ? dispatchDrop : undefined}
									onManage={
										onManageRotation
											? (): void => onManageRotation(spot.id, spot.label)
											: undefined
									}
								/>
							))}
						</PoolRow>
					))}
				</View>
				{summary}
			</Animated.View>
		</PoolTargetsContext>
	);
};
