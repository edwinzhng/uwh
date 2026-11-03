import { type InboxContent, type InboxSource, inboxRoute } from "./inbox";

export const notificationPayload = (
	source: InboxSource,
	content: InboxContent,
): { title: string; body: string; path: string } => {
	const route = inboxRoute(content.target);
	const params = new URLSearchParams(
		Object.fromEntries(
			Object.entries(route.params).map(([key, value]) => [key, value ?? ""]),
		),
	);
	const body =
		content.topic === "video"
			? "A new video clip is available."
			: content.topic === "document"
				? "A new team document is available."
				: content.topic === "lineup"
					? "Your coach published a lineup."
					: content.topic === "sessionPlan"
						? "A session plan has been updated."
						: content.topic === "rsvpNo"
							? "A player marked not attending."
							: content.topic === "goalRequest"
								? "A goal change is ready to review."
								: content.topic === "progress"
									? "A player shared a progress update."
									: source.kind === "messages"
										? "You have a new message."
										: source.kind === "feedback"
											? content.topic === "shoutout"
												? "You received a new shoutout."
												: "Your coach shared new feedback."
											: source.kind === "announcements"
												? "Your club posted an announcement."
												: source.eventPhase === "created"
													? "A new event was added."
													: source.eventPhase === "open"
														? "Registration is open."
														: source.eventPhase === "changed"
															? "An event you signed up for has changed."
															: source.eventPhase === "cancelled"
																? "An event you signed up for was cancelled."
																: "Registration closes soon.";
	return { title: "UWH Club", body, path: `${route.pathname}?${params}` };
};
