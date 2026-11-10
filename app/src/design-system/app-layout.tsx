import { useIsFocused, useLocalSearchParams, useRoute } from "expo-router";
import { type ReactElement, type ReactNode, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pageContentKey } from "../domain/page-navigation";
import { BackNavigation } from "./back-navigation";
import { ChatBackdrop } from "./chat-backdrop";
import { ChatHeaderBackdrop } from "./chat-header-backdrop";
import { chatSidebarWidth, useChatSidebar } from "./chat-workspace";
import { CompactPageHeading } from "./compact-page-heading";
import { HeaderBackdrop } from "./header-backdrop";
import { nativeTabsAvailable } from "./native-navigation";
import { PageMaterialBackground } from "./page-material-background";
import { PageReady } from "./page-ready";
import { PageTitle } from "./page-title";
import { PaginationScrollView as ScrollView } from "./pagination-scroll-view";
import type { RoleTone } from "./role-glow";
import { RolePageTint } from "./role-page-tint";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { geometry, layer, space } from "./tokens";
import { ToolbarGroup } from "./toolbar-group";
import { useKeyboardVisible } from "./use-keyboard-visible";

type Props = {
	loading?: boolean;
	roleTone?: RoleTone;
	children: ReactNode;
	title?: string;
	tabs?: ReactNode;
	subtitle?: string;
	profile?: ReactNode;
	accessory?: ReactNode;
	toolbarLeading?: ReactNode;
	toolbarCenter?: ReactNode;
	action?: ReactNode;
	actionPlacement?: "responsive" | "inline";
	titleAccessory?: ReactNode;
	workspaceTitle?: ReactNode;
	back?: ReactNode;
	footer?: ReactNode;
	floatingAction?: ReactNode;
	scrollable?: boolean;
	presentation?: "page" | "workspace";
	primaryDestination?: boolean;
	headerLayout?: "current" | "compact" | "integrated" | "content";
};
export const AppLayout = ({
	loading,
	roleTone,
	children,
	title,
	tabs,
	subtitle,
	profile,
	accessory,
	action,
	toolbarLeading,
	toolbarCenter,
	actionPlacement = "responsive",
	titleAccessory,
	workspaceTitle,
	back,
	footer,
	floatingAction,
	scrollable = true,
	presentation = "page",
	primaryDestination = false,
	headerLayout = "current",
}: Props): ReactElement => {
	const chatSidebar = useChatSidebar();
	const focused = useIsFocused();
	const visible = Platform.OS !== "web" || focused;
	const dimensions = useWindowDimensions();
	const { width } = dimensions;
	const insets = useSafeAreaInsets();
	const route = useRoute();
	const routeParameters = useLocalSearchParams();
	const contentKey = pageContentKey(route.name, routeParameters);
	const nativeNavigation = nativeTabsAvailable();
	const bottomClearance =
		nativeNavigation &&
		["index", "schedule", "messages", "club"].includes(route.name)
			? geometry.tab + insets.bottom
			: insets.bottom;
	const wide = width >= geometry.wide && !nativeNavigation;
	const keyboard = useKeyboardVisible();
	const workspace = presentation === "workspace";
	const compactRoot = primaryDestination;
	const denseHeader =
		headerLayout !== "current" && !workspace && !primaryDestination;
	const integratedHeader = denseHeader && headerLayout === "integrated";
	const backControl = back ? (
		<BackNavigation>{back}</BackNavigation>
	) : undefined;
	const glassBack = back ? (
		<ToolbarGroup label="Back navigation">{backControl}</ToolbarGroup>
	) : undefined;
	const toolbarBack =
		compactRoot || (denseHeader && headerLayout !== "compact")
			? glassBack
			: undefined;
	const [toolbarHeight, setToolbarHeight] = useState(
		geometry.touch + space.xs * 2,
	);
	const headingAction = compactRoot || integratedHeader ? undefined : action;
	const pageControls =
		(compactRoot || integratedHeader) && action ? (
			<View
				accessibilityRole="toolbar"
				accessibilityLabel={`${title ?? "Page"} actions`}
				style={{
					flexDirection: "row",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: space.xs,
				}}
			>
				{tabs ? (
					<View
						style={{
							flex: 1,
							minWidth: integratedHeader ? geometry.touch * 4 : 0,
						}}
					>
						{tabs}
					</View>
				) : undefined}
				<View style={{ marginLeft: "auto", flexShrink: 1, maxWidth: "100%" }}>
					{action}
				</View>
			</View>
		) : (
			tabs
		);
	const pagePadding = wide ? space.xxl : space.lg;
	const floatingToolbar = !workspace || primaryDestination;
	const toolbarClearance = floatingToolbar
		? denseHeader
			? toolbarHeight
			: geometry.touch + space.xs * 2
		: 0;
	const heading = denseHeader ? (
		integratedHeader ? (
			subtitle || titleAccessory ? (
				<Row wrap gap="xs">
					{subtitle ? (
						<Text variant="small" tone="secondary">
							{subtitle}
						</Text>
					) : undefined}
					{titleAccessory}
				</Row>
			) : undefined
		) : (
			<CompactPageHeading
				title={title}
				subtitle={subtitle}
				back={headerLayout === "compact" ? glassBack : undefined}
				action={headingAction}
				accessory={titleAccessory}
				large={headerLayout === "content"}
			/>
		)
	) : compactRoot ? (
		subtitle || titleAccessory ? (
			<Stack gap="xs">
				{subtitle ? <Text variant="label">{subtitle}</Text> : undefined}
				{titleAccessory}
			</Stack>
		) : undefined
	) : workspace ? (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: space.xs,
				paddingHorizontal: space.md,
				paddingVertical: space.xs,
			}}
		>
			{workspaceTitle ? (
				<ChatHeaderBackdrop topInset={insets.top} />
			) : undefined}
			{backControl}
			<View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
				{workspaceTitle ?? (
					<>
						{title ? (
							<Text variant="h3" lines={1}>
								{title}
							</Text>
						) : undefined}
						{subtitle ? (
							<Text variant="caption" tone="secondary" lines={1}>
								{subtitle}
							</Text>
						) : undefined}
					</>
				)}
			</View>
			{headingAction}
		</View>
	) : back || title ? (
		<View style={{ gap: space.sm }}>
			{back ? (
				<View
					style={{
						alignSelf: "flex-start",
					}}
				>
					{backControl}
				</View>
			) : undefined}
			{title ? (
				<View
					style={{
						flexDirection: "row",
						flexWrap: "wrap",
						alignItems: "center",
						justifyContent: "space-between",
						gap: space.sm,
					}}
				>
					<View
						style={{
							flexGrow: 1,
							flexShrink: 1,
							flexBasis: actionPlacement === "inline" ? 0 : "auto",
							minWidth: actionPlacement === "inline" ? geometry.touch * 2 : 0,
							maxWidth: "100%",
							gap: space.xxs,
						}}
					>
						<Row align="center" gap="xs" wrap>
							<Stack grow>
								<Text variant="h1">{title}</Text>
							</Stack>
							{titleAccessory}
						</Row>
						{subtitle ? (
							<Text variant="small" tone="secondary">
								{subtitle}
							</Text>
						) : undefined}
					</View>
					{headingAction ? (
						<View
							style={{
								flexShrink: 1,
								maxWidth: "100%",
								marginLeft: "auto",
							}}
						>
							{headingAction}
						</View>
					) : undefined}
				</View>
			) : undefined}
		</View>
	) : undefined;
	return (
		<View
			pointerEvents={visible ? "auto" : "none"}
			accessibilityElementsHidden={!visible}
			importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
			style={{
				flex: 1,
				opacity: visible ? 1 : 0,
				paddingTop: insets.top,
				paddingLeft: insets.left,
				paddingRight: insets.right,
			}}
		>
			<PageMaterialBackground
				showGrid={route.name !== "messages" && route.name !== "conversation"}
			/>
			{roleTone ? <RolePageTint role={roleTone} /> : undefined}
			{workspace && workspaceTitle ? <ChatBackdrop /> : undefined}
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				enabled={Platform.OS !== "web" && !primaryDestination}
				keyboardVerticalOffset={0}
				style={{ flex: 1, flexDirection: "row" }}
			>
				{wide ? (
					<View
						style={{
							width: geometry.popupWidth + (chatSidebar ? chatSidebarWidth : 0),
						}}
					/>
				) : undefined}
				<View style={{ flex: 1, minWidth: 0 }}>
					{floatingToolbar ? (
						<View
							onLayout={
								denseHeader
									? (event): void =>
											setToolbarHeight(event.nativeEvent.layout.height)
									: undefined
							}
							pointerEvents="box-none"
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								zIndex: layer.sticky,
								paddingHorizontal:
									width < 360 && toolbarCenter ? space.xs : space.md,
								paddingVertical: space.xs,
								flexDirection: "row",
								alignItems: "center",
								gap: space.xs,
								justifyContent: "flex-end",
							}}
						>
							<HeaderBackdrop topInset={insets.top} />
							{toolbarLeading || toolbarBack || integratedHeader ? (
								<View
									style={{
										marginRight: "auto",
										flexShrink: 1,
										flexGrow: integratedHeader ? 1 : undefined,
										minWidth: 0,
									}}
								>
									<View
										style={{
											flexDirection: "row",
											alignItems: "center",
											gap: space.xs,
											minWidth: 0,
										}}
									>
										{toolbarLeading}
										{toolbarBack}
										{integratedHeader ? (
											<View style={{ flex: 1, minWidth: 0 }}>
												<Text variant="h4" headingLevel={1} lines={2}>
													{title}
												</Text>
											</View>
										) : undefined}
									</View>
								</View>
							) : undefined}
							<View
								pointerEvents="box-none"
								style={{
									position: "absolute",
									left: 0,
									right: 0,
									alignItems: "center",
								}}
							>
								{toolbarCenter}
							</View>
							<ToolbarGroup>
								{accessory}
								{profile}
							</ToolbarGroup>
						</View>
					) : undefined}
					<PageReady
						loading={loading}
						contentKey={contentKey}
						layoutKey={`${toolbarHeight}:${width}:${insets.top}:${insets.left}:${insets.right}:${insets.bottom}`}
					>
						<Stack grow gap="none">
							{compactRoot && title ? <PageTitle title={title} /> : undefined}
							{workspace && heading ? (
								<View
									style={{
										paddingTop: toolbarClearance,
										zIndex: layer.sticky,
									}}
								>
									{heading}
								</View>
							) : undefined}
							{scrollable ? (
								<ScrollView
									contentInsetAdjustmentBehavior="never"
									automaticallyAdjustContentInsets={false}
									keyboardShouldPersistTaps="handled"
									keyboardDismissMode="on-drag"
									contentContainerStyle={{
										paddingHorizontal: wide ? space.lg : space.md,
										paddingTop:
											(workspace && heading ? 0 : toolbarClearance) +
											(denseHeader
												? space.xs
												: workspace
													? space.sm
													: wide
														? pagePadding
														: space.md),
										paddingBottom:
											(floatingAction ? geometry.touch + space.md : 0) +
											(nativeNavigation
												? pagePadding + bottomClearance
												: wide || footer || keyboard
													? pagePadding
													: geometry.tab +
														pagePadding +
														space.sm +
														insets.bottom),
									}}
								>
									<View
										style={{
											width: "100%",
											maxWidth: geometry.content,
											alignSelf: "center",
											gap: space.section,
										}}
									>
										{!workspace ? heading : undefined}
										{pageControls}
										{children}
									</View>
								</ScrollView>
							) : (
								<View
									style={{
										flex: 1,
										minHeight: 0,
										width: "100%",
										maxWidth: workspace ? undefined : geometry.content,
										alignSelf: "center",
										paddingHorizontal: workspace
											? space.none
											: wide
												? space.lg
												: space.md,
										paddingTop:
											(workspace && heading ? 0 : toolbarClearance) +
											(workspace ? space.none : wide ? pagePadding : space.md),
										paddingBottom: workspace ? space.none : pagePadding,
										gap: workspace ? space.none : space.section,
									}}
								>
									{!workspace ? heading : undefined}
									{pageControls}
									{children}
								</View>
							)}

							{footer ? (
								<View
									style={{
										paddingHorizontal: workspace
											? space.xs
											: wide
												? space.lg
												: space.md,
										paddingTop: workspace ? space.xs : space.md,
										paddingBottom: workspace
											? Math.max(space.xs, insets.bottom)
											: nativeNavigation
												? Math.max(space.md, bottomClearance)
												: keyboard || wide
													? space.xs
													: geometry.tab + space.lg + insets.bottom,
										backgroundColor: "transparent",
									}}
								>
									<View
										style={{
											width: "100%",
											maxWidth: workspace ? undefined : geometry.content,
											alignSelf: "center",
										}}
									>
										{footer}
									</View>
								</View>
							) : undefined}
						</Stack>
					</PageReady>
					{floatingAction ? (
						<View
							pointerEvents="box-none"
							style={{
								display: keyboard ? "none" : "flex",
								position: "absolute",
								left: space.md,
								right: space.md,
								bottom:
									nativeNavigation || wide
										? space.md + bottomClearance
										: geometry.tab + space.lg + insets.bottom,
								alignItems: "flex-end",
							}}
						>
							{floatingAction}
						</View>
					) : undefined}
				</View>
			</KeyboardAvoidingView>
		</View>
	);
};
