import { feedbackSection } from "./feedback-navigation";

export const accountSections = [
	{ value: "membership", label: "Membership" },
	{ value: "progress", label: "Progress" },
	{ value: "coach", label: "Coach feedback" },
	{ value: "self", label: "My reflections" },
	{ value: "videos", label: "Videos" },
	{ value: "attendance", label: "Attendance" },
] as const;

export type AccountSection = (typeof accountSections)[number]["value"];

export const accountSection = (
	tab: string,
	feedback?: string,
): AccountSection =>
	tab === "feedback"
		? feedbackSection(feedback)
		: tab === "progress" || tab === "attendance"
			? tab
			: "membership";

export const accountSectionParams = (
	section: AccountSection,
): { tab: string; feedback?: string } =>
	section === "coach" || section === "self" || section === "videos"
		? { tab: "feedback", feedback: section }
		: { tab: section, feedback: undefined };
