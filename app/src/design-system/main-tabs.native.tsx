import { NativeTabs } from "expo-router/unstable-native-tabs";
import { type ReactElement, useMemo } from "react";
import { DynamicColorIOS, Platform } from "react-native";
import { useButtonHaptics } from "./haptics";
import { MainTabsFallback } from "./main-tabs-fallback";
import type { MainTabsProps } from "./main-tabs-props";
import { nativeTabsAvailable } from "./native-navigation";
import { useTheme } from "./theme";
import { darkTheme, lightTheme } from "./tokens";

export const MainTabs = ({ unread = 0 }: MainTabsProps): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const colors = useMemo(
		() => ({
			default:
				Platform.OS === "ios"
					? DynamicColorIOS({
							light: lightTheme.text.secondary,
							dark: darkTheme.text.secondary,
							highContrastLight: lightTheme.text.primary,
							highContrastDark: darkTheme.text.primary,
						})
					: theme.text.secondary,
			selected:
				Platform.OS === "ios"
					? DynamicColorIOS({
							light: lightTheme.navigation.indicator,
							dark: darkTheme.navigation.indicator,
							highContrastLight: lightTheme.focus,
							highContrastDark: darkTheme.navigation.indicator,
						})
					: theme.navigation.indicator,
		}),
		[theme],
	);
	if (!nativeTabsAvailable()) return <MainTabsFallback unread={unread} />;
	return (
		<NativeTabs
			backBehavior="history"
			sidebarAdaptable={false}
			disableTransparentOnScrollEdge
			unstable_nativeProps={{ colorScheme: theme.mode }}
			tintColor={colors.selected}
			iconColor={colors}
			labelStyle={{
				default: { color: colors.default },
				selected: { color: colors.selected },
			}}
			indicatorColor={theme.navigation.selected}
			screenListeners={{
				tabPress: (event): void => {
					if (!event.data.isPrevented) haptic();
				},
			}}
		>
			<NativeTabs.Trigger
				disableAutomaticContentInsets
				name="index"
				contentStyle={{ backgroundColor: theme.background.canvas }}
			>
				<NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon
					sf={{ default: "house", selected: "house.fill" }}
					md="home"
				/>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger
				disableAutomaticContentInsets
				name="schedule"
				contentStyle={{ backgroundColor: theme.background.canvas }}
			>
				<NativeTabs.Trigger.Label>Schedule</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="calendar" md="calendar_today" />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger
				disableAutomaticContentInsets
				name="messages"
				contentStyle={{ backgroundColor: theme.background.canvas }}
			>
				<NativeTabs.Trigger.Label>Chats</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon
					sf={{
						default: "bubble.left.and.bubble.right",
						selected: "bubble.left.and.bubble.right.fill",
					}}
					md="chat"
				/>
				{unread > 0 ? (
					<NativeTabs.Trigger.Badge>
						{unread > 99 ? "99+" : String(unread)}
					</NativeTabs.Trigger.Badge>
				) : undefined}
			</NativeTabs.Trigger>
			<NativeTabs.Trigger
				disableAutomaticContentInsets
				name="club"
				contentStyle={{ backgroundColor: theme.background.canvas }}
			>
				<NativeTabs.Trigger.Label>Club</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="shield" md="shield" />
			</NativeTabs.Trigger>
		</NativeTabs>
	);
};
