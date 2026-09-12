import type { ChoiceOption } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
export const responseOptions = ({
	full,
	response,
	parts,
	part,
}: {
	full: boolean;
	response: string;
	parts?: ClubEvent["parts"];
	part?: NonNullable<ClubEvent["parts"]>[number];
}): ChoiceOption<string>[] => [
	{
		value: "going",
		tone: full && response !== "going" ? "warning" : "success",
		label:
			full && response !== "going"
				? "Join waitlist"
				: parts?.length
					? "Going · Both"
					: "Going",
	},
	...(parts ?? []).map((part) => ({
		value: `part:${part.id}`,
		label: `${part.title} only`,
		tone:
			full && response !== "going"
				? ("warning" as const)
				: ("success" as const),
	})),
	...(response === "waiting"
		? [
				{
					value: "waiting",
					label: part ? `Waitlisted · ${part.title}` : "Waitlisted",
					tone: "warning" as const,
					isDisabled: true,
				},
			]
		: []),
	{ value: "unavailable", label: "Absent", tone: "danger" },
];
