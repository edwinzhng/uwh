import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	AppLayout,
	Button,
	ClubMark,
	LoadingBoundary,
	LoadingScope,
	RoleLabel,
	RoleScope,
	type RoleTone,
	Row,
	Stack,
	Text,
} from "../design-system";
import { isPrimaryDestination, pageRoleTone } from "../domain/page-navigation";
import { FamilyMenu } from "./family-menu";
import { NotificationsMenu } from "./notifications-menu";
import { hasRouteBack, RouteBack } from "./route-back";

type Props = {
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
	const pathname = usePathname();
	const router = useRouter();
	const { headerOption } = useGlobalSearchParams<{ headerOption?: string }>();
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
				headerLayout={headerLayout}
				primaryDestination={isPrimaryDestination(pathname)}
				presentation={presentation}
				title={title}
				workspaceTitle={workspaceTitle}
				subtitle={subtitle}
				toolbarLeading={
					isPrimaryDestination(pathname) ? (
						<Row gap="xs">
							<ClubMark
								selected={pathname === "/club"}
								onPress={(): void => router.navigate("/club")}
							/>
							{toolbarLeading}
						</Row>
					) : (
						toolbarLeading
					)
				}
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
						{restrictedRole ? (
							<Row justify="end">
								<RoleLabel roleKind={restrictedRole} />
							</Row>
						) : undefined}
						<RoleScope>{children}</RoleScope>
					</Stack>
				</LoadingBoundary>
			</AppLayout>
		</LoadingScope>
	);
};
