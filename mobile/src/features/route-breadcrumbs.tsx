import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { Breadcrumbs } from "../design-system";

const routes: Record<
	string,
	{
		parent: "/members" | "/messages" | "/schedule" | "/club" | "/account";
		parentLabel: string;
		label: string;
	}
> = {
	"/account-settings": {
		parent: "/account",
		parentLabel: "Account",
		label: "Settings",
	},
	"/membership": {
		parent: "/account",
		parentLabel: "Account",
		label: "Membership",
	},
	"/my-progress": {
		parent: "/account",
		parentLabel: "Account",
		label: "Progress",
	},
	"/members": { parent: "/club", parentLabel: "Club", label: "Members" },
	"/club-information": {
		parent: "/club",
		parentLabel: "Club",
		label: "Information",
	},
	"/series": { parent: "/schedule", parentLabel: "Schedule", label: "Series" },
	"/member": { parent: "/members", parentLabel: "Members", label: "Profile" },
	"/progress": { parent: "/members", parentLabel: "Members", label: "Profile" },
	"/conversation": {
		parent: "/messages",
		parentLabel: "Messages",
		label: "Conversation",
	},
	"/session": {
		parent: "/schedule",
		parentLabel: "Schedule",
		label: "Session",
	},
	"/settings": { parent: "/club", parentLabel: "Club", label: "Settings" },
	"/moderation": { parent: "/club", parentLabel: "Club", label: "Moderation" },
	"/payments": { parent: "/club", parentLabel: "Club", label: "Payments" },
	"/registration": {
		parent: "/club",
		parentLabel: "Club",
		label: "Registration",
	},
	"/coaching-hours": {
		parent: "/club",
		parentLabel: "Club",
		label: "Coaching hours",
	},
	"/attendance-report": {
		parent: "/club",
		parentLabel: "Club",
		label: "Attendance report",
	},
	"/equipment": { parent: "/club", parentLabel: "Club", label: "Equipment" },
	"/fitness": { parent: "/club", parentLabel: "Club", label: "Fitness" },
	"/import": { parent: "/club", parentLabel: "Club", label: "Import" },
	"/delete-account": {
		parent: "/account",
		parentLabel: "Account",
		label: "Delete account",
	},
	"/connect-account": {
		parent: "/account",
		parentLabel: "Account",
		label: "Connect account",
	},
};

export const hasRouteBreadcrumbs = (pathname: string): boolean =>
	pathname in routes;

export const RouteBreadcrumbs = ({
	pathname,
}: {
	pathname: string;
}): ReactElement | undefined => {
	const router = useRouter();
	const route = routes[pathname];
	if (!route) return undefined;
	return (
		<Breadcrumbs
			parentLabel={route.parentLabel}
			currentLabel={route.label}
			onParentPress={(): void => router.navigate(route.parent)}
		/>
	);
};
