import { usePathname, useRouter } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import clubLogo from "../../assets/club-logo.png";
import { useApp } from "../demo/app-state";
import { DesktopNavigation, NavigationFrame } from "../design-system";
import { FamilyMenu } from "./family-menu";
import { NotificationsMenu } from "./notifications-menu";
import { useClubNavigation } from "./use-club-navigation";

export const AppNavigation = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const path = usePathname();
	const router = useRouter();
	const { data } = useApp();
	const navigation = useClubNavigation();
	return (
		<NavigationFrame
			routeKey={path}
			navigation={navigation}
			hidden={path === "/design-system"}
		>
			{children}
			{path !== "/design-system" ? (
				<DesktopNavigation
					brand={data.clubName}
					logo={data.clubName === "Calgary Crocs" ? clubLogo : undefined}
					onBrandPress={(): void => router.navigate("/")}
					navigation={navigation}
					profile={<FamilyMenu />}
					notifications={<NotificationsMenu labeled />}
				/>
			) : undefined}
		</NavigationFrame>
	);
};
