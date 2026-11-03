import { usePathname } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import {
	ChatWorkspace,
	DesktopNavigation,
	NavigationFrame,
} from "../design-system";
import { MessagesScreen } from "./messages-screen";
import { useClubNavigation } from "./use-club-navigation";

export const AppNavigation = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const path = usePathname();
	const navigation = useClubNavigation();
	const hidden = ["/otp-test", "/review-auth", "/glass-preview"].includes(path);
	return (
		<NavigationFrame
			routeKey={path}
			navigation={navigation}
			hidden={hidden || path === "/conversation"}
		>
			<ChatWorkspace
				active={path === "/conversation"}
				sidebar={<MessagesScreen embedded />}
			>
				{children}
			</ChatWorkspace>
			{!hidden ? <DesktopNavigation navigation={navigation} /> : undefined}
		</NavigationFrame>
	);
};
