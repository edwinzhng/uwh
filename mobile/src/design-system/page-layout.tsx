import type { ReactElement, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "./button";
import { Icon, type IconName } from "./icon";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, layer, space } from "./tokens";

type NavigationItem = {
	label: string;
	icon: IconName;
	selected: boolean;
	onPress: () => void;
};
type Props = {
	children: ReactNode;
	navigation: NavigationItem[];
	title?: string;
	subtitle?: string;
	accessory?: ReactNode;
	context?: ReactNode;
};
export const PageLayout = ({
	children,
	navigation,
	title,
	subtitle,
	accessory,
	context,
}: Props): ReactElement => {
	const theme = useTheme();
	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: theme.background.primary }}
		>
			<View
				style={{
					backgroundColor: theme.background.primary,
					borderBottomWidth: geometry.border,
					borderBottomColor: theme.border,
					paddingHorizontal: space.lg,
					paddingVertical: space.xs,
				}}
			>
				<Stack gap="sm">
					<Row justify="between" wrap>
						<Row>
							<Icon name="shield" />
							<Text variant="h4">Crocs Club</Text>
							<Text variant="caption" tone="secondary">
								Preview
							</Text>
						</Row>
						{accessory}
					</Row>
					{context}
				</Stack>
			</View>
			<ScrollView
				contentContainerStyle={{ flexGrow: 1, padding: space.lg }}
				keyboardShouldPersistTaps="handled"
			>
				<View
					style={{
						width: "100%",
						maxWidth: geometry.content,
						alignSelf: "center",
						gap: space.lg,
						paddingVertical: space.md,
					}}
				>
					{title || subtitle ? (
						<Stack gap="xs">
							{title ? <Text variant="h1">{title}</Text> : undefined}
							{subtitle ? <Text tone="secondary">{subtitle}</Text> : undefined}
						</Stack>
					) : undefined}
					{children}
				</View>
			</ScrollView>
			<View
				style={{
					zIndex: layer.sticky,
					backgroundColor: theme.background.primary,
					borderTopWidth: geometry.border,
					borderTopColor: theme.border,
					padding: space.xs,
				}}
			>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{
						flexGrow: 1,
						justifyContent: "center",
						gap: space.xxs,
					}}
				>
					{navigation.map((item) => (
						<Button
							key={item.label}
							label={item.label}
							prefix={item.icon}
							variant={item.selected ? "selection" : "ghost"}
							isSelected={item.selected}
							onPress={item.onPress}
						/>
					))}
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};
