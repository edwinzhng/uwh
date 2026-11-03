import type { Href } from "expo-router";
import { featureIdentity, type IconName } from "../design-system";
import type { ClubTool } from "../domain/club-navigation";

type ClubToolLink = {
	title: string;
	description?: string;
	icon: IconName;
	href: Href;
};

export const clubToolLinks = {
	announcements: {
		title: "Announcements",
		icon: "megaphone",
		href: "/announcements",
	},
	programs: {
		title: "Programs",
		description: "Schedules and rosters",
		icon: "layers",
		href: "/programs",
	},
	members: {
		title: "Members",
		description: "Players, parents and coaches",
		icon: "users",
		href: "/members",
	},
	fitness: {
		title: "Fitness tests",
		description: "Swim tests and results",
		icon: featureIdentity.fitness.icon,
		href: "/fitness",
	},
	videos: {
		title: "Videos",
		description: "Clips and video feedback",
		icon: "image",
		href: { pathname: "/resources", params: { kind: "video" } },
	},
	documents: {
		title: "Documents",
		icon: "archive",
		href: { pathname: "/resources", params: { kind: "document" } },
	},
	coaching: {
		title: "Overview",
		description: "Practice preparation and review queue",
		icon: "home",
		href: { pathname: "/", params: { view: "coaching" } },
	},
	reviews: {
		title: "Player reviews",
		description: "Goals and coach assessments",
		icon: "users",
		href: "/development",
	},
	hours: {
		title: "Assignments & hours",
		icon: "clock",
		href: "/coaching-hours",
	},
	attendance: {
		title: "Attendance reports",
		icon: "layers",
		href: "/attendance-report",
	},
	registration: { title: "Registration", icon: "users", href: "/registration" },
	payments: { title: "Payments", icon: "layers", href: "/payments" },
	equipment: { title: "Equipment", icon: "archive", href: "/equipment" },
	settings: { title: "Club settings", icon: "settings", href: "/settings" },
	moderation: { title: "Moderation", icon: "message", href: "/moderation" },
	imports: { title: "Import data", icon: "download", href: "/import" },
} satisfies Record<ClubTool, ClubToolLink>;
