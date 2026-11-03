export const accountSections = [
	{ value: "membership", label: "Membership" },
	{ value: "fitness", label: "Fitness" },
	{ value: "goals", label: "Goals & reflections" },
	{ value: "feedback", label: "Feedback" },
	{ value: "attendance", label: "Attendance" },
] as const;

export type AccountSection = (typeof accountSections)[number]["value"];

export const accountSection = (
	tab: string,
	feedback?: string,
): AccountSection =>
	tab === "feedback"
		? feedback === "self"
			? "goals"
			: "feedback"
		: tab === "progress" || tab === "fitness"
			? "fitness"
			: tab === "goals" || tab === "attendance"
				? tab
				: "membership";

export const accountSectionParams = (
	section: AccountSection,
): { tab: string; feedback?: string } => ({
	tab: section,
	feedback: undefined,
});
