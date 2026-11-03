import { useGlobalSearchParams, usePathname } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	AppLayout,
	Button,
	LoadingBoundary,
	LoadingScope,
	Row,
	Stack,
	Text,
} from "../design-system";
import { isPrimaryDestination } from "../domain/page-navigation";
import { FamilyMenu } from "./family-menu";
import { NotificationsMenu } from "./notifications-menu";
import { hasRouteBack, RouteBack } from "./route-back";

type Props = {
	children: ReactNode;
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
	const { headerOption } = useGlobalSearchParams<{ headerOption?: string }>();
	const headerLayout =
		process.env.EXPO_PUBLIC_REVIEW_MODE === "true" &&
		(headerOption === "compact" ||
			headerOption === "integrated" ||
			headerOption === "content")
			? headerOption
			: "content";
	const { loading } = useApp();
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
				toolbarLeading={toolbarLeading}
				toolbarCenter={toolbarCenter}
				action={action}
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
						{children}
					</Stack>
				</LoadingBoundary>
			</AppLayout>
		</LoadingScope>
	);
};
