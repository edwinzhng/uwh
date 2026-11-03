import {
	type ReactElement,
	type RefObject,
	useLayoutEffect,
	useState,
} from "react";
import {
	Modal,
	Platform,
	Pressable,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dialog } from "./dialog";
import type { MessageReactionProps } from "./message-reaction-props";
import { QuickReactions } from "./quick-reactions";
import { ReactionContent } from "./reaction-content";
import { useTheme } from "./theme";
import { corners, elevation, geometry, space } from "./tokens";

export const ReactionOverlay = ({
	anchor,
	isOpen,
	mode,
	error,
	recent,
	selected,
	isDisabled,
	onClose,
	onAll,
	onSelect,
}: Pick<
	MessageReactionProps,
	| "isOpen"
	| "mode"
	| "error"
	| "recent"
	| "selected"
	| "isDisabled"
	| "onClose"
	| "onAll"
	| "onSelect"
> & { anchor: RefObject<View | null> }): ReactElement => {
	const theme = useTheme();
	const viewport = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const [quickPresented, setQuickPresented] = useState(false);
	const dismiss = (): void => {
		if (!isDisabled) onClose();
	};
	const [position, setPosition] = useState<{ left: number; top: number }>();
	const width = Math.min(
		geometry.touch * 6 + space.xs * 2,
		viewport.width - space.sm * 2,
	);
	const height = geometry.touch + space.xs * 2 + (error ? geometry.touch : 0);
	useLayoutEffect(() => {
		if (!isOpen || mode !== "quick") {
			setPosition(undefined);
			return;
		}
		const request = { active: true };
		anchor.current?.measureInWindow(
			(x, y, triggerWidth, triggerHeight): void => {
				if (!request.active) return;
				setPosition({
					left: Math.max(
						space.xs,
						Math.min(
							viewport.width - width - space.xs,
							x + triggerWidth / 2 - width / 2,
						),
					),
					top: Math.max(
						insets.top + space.xs,
						Math.min(
							viewport.height - insets.bottom - height - space.xs,
							y - height - space.xs >= insets.top
								? y - height - space.xs
								: y + triggerHeight + space.xs,
						),
					),
				});
			},
		);
		return (): void => {
			request.active = false;
		};
	}, [
		anchor,
		isOpen,
		mode,
		viewport.width,
		viewport.height,
		insets.top,
		insets.bottom,
		width,
		height,
	]);
	return (
		<>
			<Modal
				visible={isOpen && mode === "quick" && Boolean(position)}
				transparent
				statusBarTranslucent
				navigationBarTranslucent
				onRequestClose={dismiss}
				onShow={(): void => {
					if (Platform.OS === "ios") setQuickPresented(true);
				}}
				onDismiss={(): void => setQuickPresented(false)}
				supportedOrientations={[
					"portrait",
					"landscape-left",
					"landscape-right",
				]}
			>
				<View style={{ flex: 1 }} accessibilityViewIsModal>
					<Pressable
						accessibilityLabel="Close reactions"
						accessibilityRole="button"
						onPress={dismiss}
						disabled={isDisabled}
						style={{ position: "absolute", inset: 0 }}
					/>
					<View
						style={{
							position: "absolute",
							left: position?.left,
							top: position?.top,
							width,
							padding: space.xs,
							backgroundColor: theme.background.primary,
							borderRadius: corners.pill,
							borderWidth: geometry.border,
							borderColor: theme.border,
							...elevation.floating,
						}}
					>
						<QuickReactions
							onSelect={onSelect}
							onAll={onAll}
							selected={selected}
							isDisabled={isDisabled}
							error={error}
						/>
					</View>
				</View>
			</Modal>
			<Dialog
				intent="picker"
				title="React"
				hideHeader
				scrollable={false}
				isOpen={isOpen && mode === "all" && !quickPresented}
				isDismissDisabled={isDisabled}
				onOpenChange={(open): void => {
					if (!open) dismiss();
				}}
				footer={false}
			>
				{isOpen && mode === "all" ? (
					<ReactionContent
						onSelect={onSelect}
						onClose={dismiss}
						isDisabled={isDisabled}
						error={error}
						recent={recent}
						selected={selected}
					/>
				) : undefined}
			</Dialog>
		</>
	);
};
