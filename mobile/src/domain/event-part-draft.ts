import type { EventDraft } from "./app-types";

const timeMinutes = (value: string): number => {
	const [hours, minutes] = value.split(":").map(Number);
	return (hours ?? 0) * 60 + (minutes ?? 0);
};

const clockTime = (minutes: number): string =>
	`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const toggleEventParts = (
	draft: EventDraft,
	enabled: boolean,
): EventDraft => {
	if (!enabled) return { ...draft, parts: undefined };
	if (draft.parts?.length) return draft;
	const start = timeMinutes(draft.start);
	const end = timeMinutes(draft.end);
	const split = clockTime(
		Math.max(
			start + 1,
			Math.min(
				end - 1,
				start + 45,
				start + Math.round((end - start) / 30) * 15,
			),
		),
	);
	return {
		...draft,
		kind: "training",
		parts: [
			{
				id: "training",
				title: "Training",
				kind: "training",
				start: draft.start,
				end: split,
			},
			{
				id: "hockey",
				title: "Hockey",
				kind: "hockey",
				start: split,
				end: draft.end,
			},
		],
	};
};

export const updateEventPartTime = (
	draft: EventDraft,
	partId: string,
	boundary: "start" | "end",
	value: string,
): EventDraft => {
	const original = draft.parts?.find((part) => part.id === partId);
	if (!original || !draft.parts) return draft;
	const index = draft.parts.findIndex((part) => part.id === partId);
	const parts = draft.parts.map((part, partIndex) =>
		part.id === partId
			? { ...part, [boundary]: value }
			: boundary === "end" &&
					partIndex === index + 1 &&
					part.start === original.end
				? { ...part, start: value }
				: boundary === "start" &&
						partIndex === index - 1 &&
						part.end === original.start
					? { ...part, end: value }
					: part,
	);
	return {
		...draft,
		parts,
		start: parts.at(0)?.start ?? draft.start,
		end: parts.at(-1)?.end ?? draft.end,
	};
};
