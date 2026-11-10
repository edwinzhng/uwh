import { useLocalSearchParams, useRoute } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	AppLayout,
	Button,
	LoadingBoundary,
	LoadingScope,
	RoleLabel,
	RoleScope,
	type RoleTone,
	Row,
	Stack,
	Text,
} from "../design-system";
import {
	isPrimaryDestination,
	pagePathname,
	pageRoleTone,
} from "../domain/page-navigation";
import { FamilyMenu } from "./family-menu";
import { NotificationsMenu } from "./notifications-menu";
import { PlayerViewNotice } from "./player-view-notice";
import { hasRouteBack, RouteBack } from "./route-back";

type Props = {
	contentLoading?: boolean;
	children: ReactNode;
	roleTone?: RoleTone;
	title?: string;
	workspaceTitle?: ReactNode;
	subtitle?: string;
	action?: ReactNode;
	toolbarLeading?: ReactNode;
	toolbarCenter?: ReactNode;
	actionPlacement?: "responsive" | "inline";
	tabs?: ReactNode;
	back?: ReactNode;
	footer?: ReactNode;
	floatingAction?: ReactNode;
	scrollable?: boolean;
	presentation?: "page" | "workspace";
};
export const ClubShell = ({
	contentLoading = false,
	children,
	roleTone,
	title,
	workspaceTitle,
	subtitle,
	action,
	toolbarLeading,
	toolbarCenter,
	actionPlacement,
	tabs,
	back,
	footer,
	floatingAction,
	scrollable,
	presentation = "page",
}: Props): ReactElement => {
	const pathname = pagePathname(useRoute().name);
	const { headerOption } = useLocalSearchParams<{ headerOption?: string }>();
	const headerLayout =
		process.env.EXPO_PUBLIC_REVIEW_MODE === "true" &&
		(headerOption === "compact" ||
			headerOption === "integrated" ||
			headerOption === "content")
			? headerOption
			: "content";
	const { loading } = useApp();
	const restrictedRole = roleTone ?? pageRoleTone(pathname);
	const { error, clearError } = useAppStatus();
	return (
		<LoadingScope>
			<AppLayout
				loading={Boolean(loading) || contentLoading}
				roleTone={restrictedRole}
				headerLayout={headerLayout}
				primaryDestination={isPrimaryDestination(pathname)}
				presentation={presentation}
				title={title}
				workspaceTitle={workspaceTitle}
				subtitle={subtitle}
				titleAccessory={
					restrictedRole ? <RoleLabel roleKind={restrictedRole} /> : undefined
				}
				toolbarLeading={toolbarLeading}
				toolbarCenter={toolbarCenter}
				action={
					action ? (
						<RoleScope tone={restrictedRole}>{action}</RoleScope>
					) : undefined
				}
				actionPlacement={actionPlacement}
				tabs={tabs}
				back={
					back ??
					(presentation === "page" && hasRouteBack(pathname) ? (
						<RouteBack pathname={pathname} />
					) : undefined)
				}
				footer={footer}
				floatingAction={floatingAction}
				scrollable={scrollable}
				profile={<FamilyMenu />}
				accessory={<NotificationsMenu />}
			>
				<PlayerViewNotice />
				{error ? (
					<Row justify="between" wrap>
						<Text variant="small" tone="danger">
							{error}
						</Text>
						<Button label="Dismiss" variant="ghost" onPress={clearError} />
					</Row>
				) : undefined}
				<LoadingBoundary loading={Boolean(loading)} fill={scrollable === false}>
					<Stack
						grow={scrollable === false}
						gap={
							presentation === "workspace"
								? "none"
								: scrollable === false
									? "md"
									: "xl"
						}
					>
						<RoleScope>{children}</RoleScope>
					</Stack>
				</LoadingBoundary>
			</AppLayout>
		</LoadingScope>
	);
};
