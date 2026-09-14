import type { ReactElement, ReactNode } from "react";
import {
	type ImageSourcePropType,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandIdentity } from "./brand-identity";
import { GlassPanel } from "./glass-panel";
import type { NavigationItem } from "./navigation-control";
import { Row } from "./row";
import { SidebarNavigation } from "./sidebar-navigation";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, layer, space } from "./tokens";
import { useKeyboardVisible } from "./use-keyboard-visible";
import { WaterBackground } from "./water-background";

type Props = {
	children: ReactNode;
	title?: string;
	tabs?: ReactNode;
	subtitle?: string;
	brand: string;
	brandLogo?: ImageSourcePropType;
	onBrandPress?: () => void;
	navigation: NavigationItem[];
	profile?: ReactNode;
	accessory?: ReactNode;
	action?: ReactNode;
	titleAccessory?: ReactNode;
	back?: ReactNode;
	footer?: ReactNode;
	scrollable?: boolean;
	persistentNavigation?: boolean;
};
export const AppLayout = ({
	children,
	title,
	tabs,
	subtitle,
	brand,
	brandLogo,
	onBrandPress,
	navigation,
	profile,
	accessory,
	action,
	titleAccessory,
	back,
	footer,
	scrollable = true,
	persistentNavigation = false,
}: Props): ReactElement => {
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const wide = width >= geometry.wide;
	const keyboard = useKeyboardVisible();
	const pagePadding = wide ? space.xxl : space.lg;
	const heading =
		back || title ? (
			<View style={{ gap: space.sm }}>
				{back ? (
					<View
						style={{
							alignSelf: "flex-start",
						}}
					>
						{back}
					</View>
				) : undefined}
				{title ? (
					<Row justify="between" align="start" wrap>
						<View
							style={{
								flexGrow: 1,
								flexShrink: 1,
								flexBasis: geometry.popupWidth,
								minWidth: 0,
								gap: space.xxs,
							}}
						>
							<Row align="center" gap="xs" wrap>
								<Stack>
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
						{action}
					</Row>
				) : undefined}
			</View>
		) : undefined;
	return (
		<SafeAreaView
			edges={["top", "left", "right"]}
			style={{ flex: 1, backgroundColor: theme.background.primary }}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				enabled={Platform.OS !== "web"}
				style={{ flex: 1, flexDirection: "row" }}
			>
				{wide && persistentNavigation ? (
					<View style={{ width: geometry.popupWidth }} />
				) : wide ? (
					<View
						nativeID="club-navigation-surface"
						style={{
							width: geometry.popupWidth,
							backgroundColor: "transparent",
							padding: space.sm,
							borderRightWidth: geometry.border,
							borderRightColor: theme.border,
						}}
					>
						<WaterBackground />

						<Stack gap="xl">
							<BrandIdentity
								name={brand}
								logo={brandLogo}
								onPress={onBrandPress}
							/>
							<SidebarNavigation navigation={navigation} />
						</Stack>
					</View>
				) : undefined}
				<View style={{ flex: 1, minWidth: 0 }}>
					{!wide ? (
						<>
							<View
								style={{
									position: "absolute",
									left: space.md,
									top: space.md,
									zIndex: layer.sticky,
								}}
							>
								<GlassPanel
									interactive
									shape="panel"
									material="floating"
									padding="none"
								>
									{accessory}
								</GlassPanel>
							</View>
							<View
								style={{
									position: "absolute",
									right: space.md,
									top: space.md,
									zIndex: layer.sticky,
									maxWidth: "70%",
								}}
							>
								<GlassPanel
									interactive
									shape="panel"
									material="floating"
									padding="none"
								>
									{profile}
								</GlassPanel>
							</View>
						</>
					) : undefined}
					{scrollable ? (
						<ScrollView
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="on-drag"
							contentContainerStyle={{
								paddingHorizontal: wide ? space.lg : space.md,
								paddingTop: wide
									? pagePadding
									: geometry.touch + space.sm + space.lg + pagePadding,
								paddingBottom:
									wide || footer || keyboard
										? pagePadding
										: geometry.tab + pagePadding + space.sm + insets.bottom,
							}}
						>
							<View
								style={{
									width: "100%",
									maxWidth: geometry.content,
									alignSelf: "center",
									gap: space.xl,
								}}
							>
								{heading}
								{tabs}
								{children}
							</View>
						</ScrollView>
					) : (
						<View
							style={{
								flex: 1,
								minHeight: 0,
								width: "100%",
								maxWidth: geometry.content,
								alignSelf: "center",
								paddingHorizontal: wide ? space.lg : space.md,
								paddingTop: wide
									? pagePadding
									: geometry.touch + space.sm + space.lg + pagePadding,
								paddingBottom: pagePadding,
								gap: space.md,
							}}
						>
							{heading}
							{tabs}
							{children}
						</View>
					)}

					{footer ? (
						<View
							style={{
								paddingHorizontal: wide ? space.lg : space.md,
								paddingTop: space.xs,
								paddingBottom:
									keyboard || wide
										? space.xs
										: geometry.tab + space.lg + insets.bottom,
								backgroundColor: "transparent",
							}}
						>
							<View
								style={{
									width: "100%",
									maxWidth: geometry.content,
									alignSelf: "center",
								}}
							>
								{footer}
							</View>
						</View>
					) : undefined}
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};
