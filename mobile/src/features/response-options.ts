import type { ChoiceOption } from "../design-system";
export const responseOptions = ({
	full,
	response,
}: {
	full: boolean;
	response: string;
}): ChoiceOption<string>[] => [
	...(response === "unanswered"
		? [
				{
					value: "unanswered",
					label: "Respond",
					tone: "warning" as const,
					isDisabled: true,
				},
			]
		: []),
	{
		value: "going",
		label: full && response !== "going" ? "Join waitlist" : "Going",
		tone: full && response !== "going" ? "warning" : "success",
	},
	...(response === "waiting"
		? [
				{
					value: "waiting",
					label: "Waitlisted",
					tone: "warning" as const,
					isDisabled: true,
				},
			]
		: []),
	{ value: "unavailable", label: "Can’t attend", tone: "danger" },
];
