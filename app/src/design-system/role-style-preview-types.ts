import type { Href } from "expo-router";
import type { IconName } from "./icon";
export type RoleStyle = "glow" | "badge" | "rail";
export type PreviewRole = "coach" | "admin";
export type RoleDestination = { label: string; icon: IconName; href: Href };
export const roleDestinations = {
	coach: {
		label: "Coach",
		heading: "Coaching",
		card: { label: "Hours", icon: "clock", href: "/coaching-hours" },
		action: {
			label: "Rate players",
			icon: "star",
			href: { pathname: "/members", params: { tab: "rankings" } },
		},
	},
	admin: {
		label: "Admin",
		heading: "Administration",
		card: { label: "Payments", icon: "payments", href: "/payments" },
		action: {
			label: "Invites",
			icon: "users",
			href: { pathname: "/members", params: { tab: "invites" } },
		},
	},
} satisfies Record<
	PreviewRole,
	{
		label: string;
		heading: string;
		card: RoleDestination;
		action: RoleDestination;
	}
>;
