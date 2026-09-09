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
import { NavigationControl, type NavigationItem } from "./navigation-control";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { control, geometry, layer, space } from "./tokens";
import { useKeyboardVisible } from "./use-keyboard-visible";

type Props = {
	children: ReactNode;
	title?: string;
	subtitle?: string;
	brand: string;
	brandLogo?: ImageSourcePropType;
	navigation: NavigationItem[];
	profile?: ReactNode;
	accessory?: ReactNode;
	action?: ReactNode;
	titleAccessory?: ReactNode;
	back?: ReactNode;
	footer?: ReactNode;
	scrollable?: boolean;
};
export const AppLayout = ({
	children,
	title,
	subtitle,
	brand,
	brandLogo,
	navigation,
	profile,
	accessory,
	action,
	titleAccessory,
	back,
	footer,
	scrollable = true,
}: Props): ReactElement => {
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const wide = width >= geometry.wide;
	const keyboard = useKeyboardVisible();
	const heading =
		back || title ? (
			<View style={{ gap: space.sm }}>
				{back ? (
					<View
						style={{
							alignSelf: "flex-start",
							marginStart: -(control.paddingX + geometry.border),
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
							<Row justify="between" align="start">
								<Stack grow>
									<Text variant="h2">{title}</Text>
								</Stack>
								{titleAccessory}
							</Row>
							{subtitle ? (
								<Text variant="small" tone="secondary">
									{subtitle}
								</Text>
							) : undefined}
						</View>
						{titleAccessory ? undefined : action}
					</Row>
				) : undefined}
				{titleAccessory && action ? (
					<Row justify="end">{action}</Row>
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
				{wide ? (
					<View
						style={{
							width: geometry.popupWidth,
							backgroundColor: theme.background.secondary,
							padding: space.sm,
							borderRightWidth: geometry.border,
							borderRightColor: theme.border,
						}}
					>
						<Stack gap="xl">
							<BrandIdentity name={brand} logo={brandLogo} />
							<Stack gap="xxs">
								{navigation.map((item) => (
									<NavigationControl key={item.label} item={item} />
								))}
							</Stack>
						</Stack>
					</View>
				) : undefined}
				<View style={{ flex: 1, minWidth: 0 }}>
					<View
						style={{
							paddingHorizontal: wide ? space.lg : space.md,
							paddingVertical: space.sm,
							zIndex: layer.sticky,
							borderBottomWidth: geometry.border,
							borderBottomColor: theme.border,
							backgroundColor: theme.background.primary,
						}}
					>
						<Row justify="between">
							<BrandIdentity name={brand} logo={brandLogo} />
							<Row gap="xs">
								{accessory}
								{profile}
							</Row>
						</Row>
					</View>
					{scrollable ? (
						<ScrollView
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode="on-drag"
							contentContainerStyle={{
								paddingHorizontal: wide ? space.lg : space.md,
								paddingTop: space.md,
								paddingBottom:
									footer || keyboard
										? space.md
										: geometry.tab + space.xxl + insets.bottom,
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
								paddingTop: space.md,
								gap: space.md,
							}}
						>
							{heading}
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
								borderTopWidth: geometry.border,
								borderTopColor: theme.border,
								backgroundColor: theme.background.primary,
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
