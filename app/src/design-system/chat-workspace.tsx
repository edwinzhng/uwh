import {
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
} from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { nativeTabsAvailable } from "./native-navigation";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, layer, space } from "./tokens";

const ChatSidebarContext = createContext(false);
export const chatSidebarWidth = geometry.popupWidth + space.xxl * 2;
export const useChatSidebar = (): boolean => useContext(ChatSidebarContext);

export const ChatWorkspace = ({
	children,
	sidebar,
	active,
}: {
	children: ReactNode;
	sidebar: ReactNode;
	active: boolean;
}): ReactElement => {
	const { width } = useWindowDimensions();
	const visible = active && width >= geometry.wide && !nativeTabsAvailable();
	const theme = useTheme();
	return (
		<ChatSidebarContext.Provider value={visible}>
			<View style={{ flex: 1 }}>
				{children}
				{visible ? (
					<View
						role="navigation"
						accessibilityLabel="Chats sidebar"
						style={{
							position: "absolute",
							left: geometry.popupWidth,
							top: 0,
							bottom: 0,
							width: chatSidebarWidth,
							zIndex: layer.sticky,
							backgroundColor: theme.background.canvas,
							borderRightWidth: geometry.border,
							borderRightColor: theme.border,
						}}
					>
						{sidebar}
					</View>
				) : undefined}
			</View>
		</ChatSidebarContext.Provider>
	);
};

export const ChatSidebar = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => (
	<ScrollView
		keyboardShouldPersistTaps="handled"
		contentContainerStyle={{ padding: space.md, gap: space.md }}
	>
		<Text variant="h3">Chats</Text>
		{children}
	</ScrollView>
);
