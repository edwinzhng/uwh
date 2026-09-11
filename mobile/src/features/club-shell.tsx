import { usePathname, useRouter } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import clubLogo from "../../assets/club-logo.png";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	AppLayout,
	Badge,
	Button,
	LoadingContent,
	PageReveal,
	Row,
	Text,
} from "../design-system";
import { FamilyMenu } from "./family-menu";
import { NotificationsMenu } from "./notifications-menu";
import { hasRouteBreadcrumbs, RouteBreadcrumbs } from "./route-breadcrumbs";
import { useClubNavigation } from "./use-club-navigation";

type Props = {
	children: ReactNode;
	title?: string;
	subtitle?: string;
	action?: ReactNode;
	tabs?: ReactNode;
	titleSize?: "page" | "section";
	back?: ReactNode;
	staffRole?: "coach" | "admin";
	footer?: ReactNode;
	scrollable?: boolean;
};
export const ClubShell = ({
	children,
	title,
	subtitle,
	action,
	tabs,
	titleSize,
	back,
	staffRole,
	footer,
	scrollable,
}: Props): ReactElement => {
	const navigation = useClubNavigation();
	const pathname = usePathname();
	const activePerson = useActivePerson();
	const router = useRouter();
	const { data, error, clearError, loading } = useApp();
	return (
		<AppLayout
			persistentNavigation
			brand={data.clubName}
			onBrandPress={(): void => router.navigate("/club")}
			brandLogo={data.clubName === "Calgary Crocs" ? clubLogo : undefined}
			title={title}
			subtitle={subtitle}
			action={action}
			tabs={tabs}
			titleSize={titleSize}
			titleAccessory={
				staffRole ? (
					<Badge
						label={staffRole === "admin" ? "Admin" : "Coach"}
						kind={staffRole}
					/>
				) : undefined
			}
			back={
				hasRouteBreadcrumbs(pathname) ? (
					<RouteBreadcrumbs pathname={pathname} />
				) : (
					back
				)
			}
			footer={footer}
			scrollable={scrollable}
			profile={<FamilyMenu />}
			accessory={<NotificationsMenu />}
			navigation={navigation}
		>
			{error ? (
				<Row justify="between" wrap>
					<Text variant="small" tone="danger">
						{error}
					</Text>
					<Button label="Dismiss" variant="ghost" onPress={clearError} />
				</Row>
			) : undefined}
			{loading ? (
				<LoadingContent />
			) : (
				<PageReveal key={activePerson.id} fill={scrollable === false}>
					{children}
				</PageReveal>
			)}
		</AppLayout>
	);
};
