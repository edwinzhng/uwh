import { usePathname } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import { NavigationFrame } from "../design-system";
import { useClubNavigation } from "./use-club-navigation";

export const AppNavigation = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const path = usePathname();
	const navigation = useClubNavigation();
	return (
		<NavigationFrame
			routeKey={path}
			navigation={navigation}
			hidden={path === "/design-system"}
		>
			{children}
		</NavigationFrame>
	);
};
