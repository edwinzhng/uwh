import {
	type ReactElement,
	type ReactNode,
	useEffect,
	useReducer,
	useRef,
} from "react";
import {
	AccessibilityInfo,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DialogDragSurface } from "./dialog-drag-surface";
import { DialogGestureRoot } from "./dialog-gesture-root";
import { dialogStackGeometry } from "./dialog-stack";
import {
	canDismissDialog,
	type DialogIntent,
	dialogContentWidth,
	dialogMaxHeight,
	dialogPresentation,
	dialogRetention,
	dialogStepChanged,
	dialogTransitionDuration,
	initialDialogRetention,
} from "./dialog-state";
import { GlassBackdrop } from "./glass-backdrop";
import { previewGlassColors, useGlassPreview } from "./glass-preview-context";
import { IconButton } from "./icon-button";
import { LiquidPanelBackdrop } from "./liquid-panel-backdrop";
import { LoadingScope } from "./loading-scope";
import { materialColors } from "./materials";
import { ModalListBoundary } from "./modal-list-boundary";
import { PickerSizingContext } from "./picker-layout-context";
import { PopupPortalProvider } from "./popup-portal-provider";
import { Row } from "./row";
import { ScrollArea } from "./scroll-area";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, layer, motion, opacity, space } from "./tokens";
import { useDialogDrag } from "./use-dialog-drag";
import { DialogStackParent, useDialogStack } from "./use-dialog-stack";
import { useMotion } from "./use-motion";
import { useVisibleViewport } from "./use-visible-viewport";

export type DialogProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onAfterClose?: () => void;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	hideHeader?: boolean;
	scrollable?: boolean;
	intent?: DialogIntent;
	isDismissDisabled?: boolean;
	focusKey?: string;
};
export const DialogContent = ({
	isOpen,
	onOpenChange,
	onAfterClose,
	title,
	children,
	footer,
	hideHeader = false,
	scrollable = true,
	intent = "detail",
	isDismissDisabled = false,
	focusKey,
}: DialogProps): ReactElement | undefined => {
	const theme = useTheme();
	const treatment = useGlassPreview();
	const preview = treatment
		? previewGlassColors(theme.mode === "dark", treatment)
		: undefined;
	const insets = useSafeAreaInsets();
	const { height, width, top } = useVisibleViewport(isOpen);
	const animate = useMotion();
	const presentation = dialogPresentation(
		width,
		Platform.OS === "web" ? "web" : "native",
	);
	const isSheet = presentation === "sheet";
	const lineupLandscape =
		intent === "lineup" &&
		width > height &&
		(Platform.OS !== "web" || height < geometry.narrow);
	const edgeToEdge = isSheet || lineupLandscape;
	const hasFooter = footer !== undefined && footer !== false && footer !== null;
	const dragTouchStyle: ViewStyle & { touchAction?: "none" } =
		isSheet && Platform.OS === "web" ? { touchAction: "none" } : {};
	const [retention, dispatch] = useReducer(
		dialogRetention,
		isOpen,
		initialDialogRetention,
	);
	const visible = isOpen || (animate && retention.retained);
	const lastVisibility = useRef(visible);
	const afterClose = useRef(onAfterClose);
	afterClose.current = onAfterClose;
	useEffect((): void => {
		const closed = lastVisibility.current && !visible;
		lastVisibility.current = visible;
		if (closed) afterClose.current?.();
	}, [visible]);
	const stack = useDialogStack(visible, isOpen);
	const dismissAllowed = canDismissDialog({
		isOpen,
		isTop: stack.isTop,
		isDismissDisabled,
	});
	const dismiss = (): void => {
		if (dismissAllowed) onOpenChange(false);
	};
	const transition = useRef(0);
	const previousStep = useRef(focusKey);
	const heading = useRef<View>(null);
	const progress = useSharedValue(isOpen && !animate ? 1 : 0);
	const targetBackground = dialogStackGeometry(
		stack.frontTop === undefined ? 0 : stack.depth,
		stack.frame?.height ?? 0,
		isSheet,
		stack.frame?.top ?? 0,
		insets.top,
		stack.frontTop,
	);
	const background = useSharedValue(targetBackground);
	useEffect(() => {
		background.set(
			withTiming(
				{
					scale: targetBackground.scale,
					translateY: targetBackground.translateY,
					dim: targetBackground.dim,
				},
				{
					duration: dialogTransitionDuration(animate),
					easing: Easing.bezier(...motion.easing.emphasized),
					reduceMotion: ReduceMotion.System,
				},
			),
		);
	}, [
		targetBackground.scale,
		targetBackground.translateY,
		targetBackground.dim,
		animate,
		background,
	]);
	useEffect(() => {
		const changed = dialogStepChanged(previousStep.current, focusKey, isOpen);
		previousStep.current = focusKey;
		if (!changed || !stack.isTop) return;
		const frame = requestAnimationFrame(() => {
			const target = heading.current;
			if (!target) return;
			if (Platform.OS === "web") target.focus();
			else AccessibilityInfo.sendAccessibilityEvent(target, "focus");
		});
		return (): void => cancelAnimationFrame(frame);
	}, [focusKey, isOpen, stack.isTop]);
	const {
		handlers,
		gesture,
		offset: dragOffset,
	} = useDialogDrag({
		enabled: isSheet && dismissAllowed,
		animate,
		onDismiss: dismiss,
	});
	useEffect(() => {
		if (!isOpen && transition.current === 0) return;
		transition.current += 1;
		const revision = transition.current;
		dispatch({ type: "visibility", isOpen, animate, transition: revision });
		if (isOpen && !stack.canPresent) {
			progress.set(0);
			return;
		}
		progress.set(
			withTiming(isOpen ? 1 : 0, {
				duration: dialogTransitionDuration(animate),
				easing: Easing.bezier(...motion.easing.emphasized),
				reduceMotion: ReduceMotion.System,
			}),
		);
		if (isOpen || !animate) return;
		const timeout = setTimeout(
			() => dispatch({ type: "exited", transition: revision }),
			dialogTransitionDuration(animate),
		);
		return (): void => clearTimeout(timeout);
	}, [isOpen, animate, progress, stack.canPresent]);
	const backdropStyle = useAnimatedStyle(() => ({
		opacity: stack.base
			? ((!isOpen && stack.count > 1) || !animate ? 1 : progress.get()) *
				opacity.backdrop
			: 0,
	}));
	const panelStyle = useAnimatedStyle(() => {
		const covered = animate ? background.get() : targetBackground;
		return {
			opacity: !animate
				? 1
				: isSheet && intent !== "lineup"
					? 1
					: progress.get(),
			transform:
				intent === "lineup"
					? [{ translateY: dragOffset.get() }]
					: isSheet
						? [
								{
									translateY:
										(animate ? (1 - progress.get()) * height : 0) +
										dragOffset.get() +
										covered.translateY,
								},
								{ scale: covered.scale },
							]
						: [],
		};
	});
	const coveredStyle = useAnimatedStyle(() => ({
		opacity: (animate ? background.get() : targetBackground).dim,
	}));
	const colors = materialColors(theme);
	const maxHeight = lineupLandscape
		? height
		: dialogMaxHeight(presentation, height, insets.top, insets.bottom);
	const contentInset = space.lg;
	const bottomPadding = isSheet
		? Math.max(contentInset, insets.bottom)
		: contentInset;
	const bodyPadding: ViewStyle = {
		padding: intent === "lineup" ? 0 : contentInset,
		paddingTop: hideHeader ? space.md : space.sm,
		paddingLeft: Math.max(contentInset, insets.left),
		paddingRight: Math.max(contentInset, insets.right),
		paddingBottom: hasFooter ? space.md : bottomPadding,
	};
	if (!visible || !stack.canPresent) return undefined;
	const header =
		isSheet || !hideHeader ? (
			<DialogDragSurface gesture={gesture}>
				<View
					{...handlers}
					style={[
						{
							padding: contentInset,
							paddingBottom: hideHeader ? space.xs : space.sm,
							paddingLeft:
								intent === "lineup" ? 0 : Math.max(contentInset, insets.left),
							paddingRight:
								intent === "lineup" ? 0 : Math.max(contentInset, insets.right),
							paddingTop: isSheet ? space.sm : contentInset,
							flexShrink: 0,
							minHeight: hideHeader ? geometry.touch : undefined,
							justifyContent: "center",
						},
						dragTouchStyle,
					]}
				>
					{isSheet && !preview ? (
						<View
							accessible={false}
							style={{
								alignSelf: "center",
								width: geometry.touch,
								height: space.xs,
								borderRadius: corners.pill,
								backgroundColor: theme.border,
								marginBottom: hideHeader ? 0 : space.sm,
							}}
						/>
					) : undefined}
					{!hideHeader ? (
						<Row justify="between" align="center">
							<View
								ref={heading}
								accessible={focusKey !== undefined}
								accessibilityRole={
									Platform.OS !== "web" && focusKey ? "header" : undefined
								}
								accessibilityLabel={focusKey ? title : undefined}
								tabIndex={focusKey ? -1 : undefined}
								style={{ flex: 1, minWidth: 0 }}
							>
								<Text variant="h1">{title}</Text>
							</View>
							<IconButton
								label="Close dialog"
								icon="close"
								isDisabled={!dismissAllowed}
								onPress={dismiss}
							/>
						</Row>
					) : undefined}
				</View>
			</DialogDragSurface>
		) : undefined;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			accessibilityLabel={title}
			onRequestClose={dismiss}
			onShow={stack.onShow}
		>
			<DialogGestureRoot>
				<DialogStackParent value={stack.id}>
					<PickerSizingContext value>
						<ModalListBoundary>
							<PopupPortalProvider>
								<View
									pointerEvents={stack.isTop && isOpen ? "auto" : "none"}
									accessibilityElementsHidden={!stack.isTop}
									importantForAccessibility={
										stack.isTop ? "auto" : "no-hide-descendants"
									}
									aria-hidden={!stack.isTop}
									style={{ flex: 1, maxHeight: height, marginTop: top }}
								>
									<KeyboardAvoidingView
										behavior={Platform.OS === "ios" ? "padding" : "height"}
										enabled={Platform.OS !== "web"}
										accessibilityViewIsModal={stack.isTop}
										style={{
											flex: 1,
											justifyContent: isSheet ? "flex-end" : "center",
											padding: edgeToEdge ? 0 : space.lg,
											paddingLeft: edgeToEdge
												? 0
												: Math.max(space.lg, insets.left),
											paddingRight: edgeToEdge
												? 0
												: Math.max(space.lg, insets.right),
											paddingTop: edgeToEdge
												? 0
												: Math.max(space.lg, insets.top),
											paddingBottom: edgeToEdge
												? 0
												: Math.max(space.lg, insets.bottom),
											zIndex: layer.modal,
										}}
									>
										<Animated.View
											style={[
												{
													position: "absolute",
													zIndex: layer.backdrop,
													top: 0,
													right: 0,
													bottom: 0,
													left: 0,
													backgroundColor: theme.background.contrast,
												},
												backdropStyle,
											]}
										>
											<Pressable
												accessible={false}
												focusable={false}
												disabled={!dismissAllowed}
												onPress={dismiss}
												style={{ flex: 1 }}
											/>
										</Animated.View>
										<Animated.View
											onAccessibilityEscape={dismiss}
											onLayout={(event): void => {
												stack.onLayout({
													top: event.nativeEvent.layout.y,
													height: event.nativeEvent.layout.height,
												});
											}}
											style={[
												{
													maxHeight,
													minHeight: 0,
													flexShrink: 1,
													overflow: "hidden",
													width: "100%",
													maxWidth: lineupLandscape
														? width
														: dialogContentWidth(intent),
													height: lineupLandscape ? height : undefined,
													alignSelf: "center",
													zIndex: layer.modal,
													borderColor: preview?.edge ?? theme.border,
													backgroundColor:
														intent === "lineup" || preview
															? "transparent"
															: theme.background.primary,
													borderWidth:
														isSheet && !preview ? 0 : geometry.border,
													borderRadius: lineupLandscape ? 0 : corners.overlay,
													borderBottomLeftRadius: isSheet ? 0 : undefined,
													borderBottomRightRadius: isSheet ? 0 : undefined,
													boxShadow: colors.overlayShadow,
												},
												panelStyle,
											]}
										>
											<LoadingScope active={stack.isTop && isOpen}>
												{preview ? (
													<GlassBackdrop
														material="floating"
														radius={edgeToEdge ? undefined : corners.overlay}
													/>
												) : intent === "lineup" ? (
													<LiquidPanelBackdrop />
												) : undefined}
												{intent !== "lineup" ? header : undefined}
												{scrollable ? (
													<ScrollArea
														key={focusKey}
														keyboardShouldPersistTaps="handled"
														style={{
															flexGrow: 0,
															flexShrink: 1,
															minHeight: 0,
														}}
														contentContainerStyle={bodyPadding}
													>
														{intent === "lineup" ? header : undefined}
														{children}
													</ScrollArea>
												) : (
													<View
														style={[
															bodyPadding,
															{
																flexGrow: 0,
																flexShrink: 1,
																minHeight: 0,
															},
														]}
													>
														{intent === "lineup" ? header : undefined}
														{children}
													</View>
												)}
												{hasFooter ? (
													<View
														style={{
															padding: contentInset,
															paddingTop: space.sm,
															paddingLeft: Math.max(contentInset, insets.left),
															paddingRight: Math.max(
																contentInset,
																insets.right,
															),
															paddingBottom: bottomPadding,
															flexShrink: 0,
															backgroundColor:
																intent === "lineup" || preview
																	? "transparent"
																	: theme.background.primary,
														}}
													>
														<Row justify="end">{footer}</Row>
													</View>
												) : undefined}
											</LoadingScope>
											<Animated.View
												pointerEvents="none"
												accessible={false}
												style={[
													{
														position: "absolute",
														top: 0,
														right: 0,
														bottom: 0,
														left: 0,
														backgroundColor: theme.background.contrast,
													},
													coveredStyle,
												]}
											/>
										</Animated.View>
									</KeyboardAvoidingView>
								</View>
							</PopupPortalProvider>
						</ModalListBoundary>
					</PickerSizingContext>
				</DialogStackParent>
			</DialogGestureRoot>
		</Modal>
	);
};
