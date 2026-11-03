import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { Button } from "../design-system";

const routes: Record<
	string,
	{
		parent: "/" | "/members" | "/messages" | "/schedule" | "/club" | "/account";
		parentLabel: string;
		label: string;
	}
> = {
	"/terms": { parent: "/account", parentLabel: "Account", label: "Terms" },
	"/programs": { parent: "/club", parentLabel: "Club", label: "Programs" },
	"/resources": { parent: "/club", parentLabel: "Club", label: "Resources" },
	"/development": {
		parent: "/club",
		parentLabel: "Club",
		label: "Player reviews",
	},
	"/announcements": {
		parent: "/",
		parentLabel: "Home",
		label: "Announcements",
	},
	"/shoutouts": { parent: "/", parentLabel: "Home", label: "Shoutouts" },
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
		parentLabel: "Chats",
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
		label: "Coaching",
	},
	"/attendance-report": {
		parent: "/club",
		parentLabel: "Club",
		label: "Attendance report",
	},
	"/equipment": { parent: "/club", parentLabel: "Club", label: "Equipment" },
	"/fitness": { parent: "/club", parentLabel: "Club", label: "Fitness tests" },
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

export const hasRouteBack = (pathname: string): boolean => pathname in routes;

export const RouteBack = ({
	pathname,
}: {
	pathname: string;
}): ReactElement | undefined => {
	const router = useRouter();
	const route = routes[pathname];
	if (!route) return undefined;
	return (
		<Button
			label={route.parentLabel}
			prefix="arrowLeft"
			variant="ghost"
			accessibilityLabel={`Back to ${route.parentLabel} from ${route.label}`}
			onPress={(): void => router.navigate(route.parent)}
		/>
	);
};
