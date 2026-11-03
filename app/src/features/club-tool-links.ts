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
		icon: "video",
		href: { pathname: "/resources", params: { kind: "video" } },
	},
	documents: {
		title: "Files",
		icon: "document",
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
		title: "Hours",
		icon: "clock",
		href: "/coaching-hours",
	},
	attendance: {
		title: "Attendance",
		icon: "attendance",
		href: "/attendance-report",
	},
	registration: { title: "Registration", icon: "users", href: "/registration" },
	payments: { title: "Payments", icon: "payments", href: "/payments" },
	equipment: { title: "Equipment", icon: "equipment", href: "/equipment" },
	settings: { title: "Settings", icon: "settings", href: "/settings" },
	moderation: { title: "Moderation", icon: "moderation", href: "/moderation" },
	imports: { title: "Import", icon: "download", href: "/import" },
} satisfies Record<ClubTool, ClubToolLink>;
