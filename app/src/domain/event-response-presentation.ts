import type { EventResponse } from "./app-types";

type Presentation = {
	label: string;
	tone: "success" | "danger" | "warning";
	lineup: boolean;
};

export const eventResponsePresentation = (
	response: EventResponse,
	totalParts = 0,
): Presentation =>
	response.response === "going"
		? {
				label:
					response.declinedPartIds?.length ||
					(response.partIds !== undefined &&
						response.partIds.length < totalParts)
						? "Partly attending"
						: "Attending",
				tone: "success",
				lineup: true,
			}
		: response.response === "unavailable"
			? { label: "Not attending", tone: "danger", lineup: false }
			: response.response === "waiting"
				? { label: "Waitlisted", tone: "warning", lineup: false }
				: { label: "Response needed", tone: "warning", lineup: false };
