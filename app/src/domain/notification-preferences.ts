export type NotificationTopic =
	| "groupMessage"
	| "directMessage"
	| "coachMessage"
	| "chatAnnouncement"
	| "coachingFeedback"
	| "shoutout"
	| "event"
	| "video"
	| "document"
	| "lineup"
	| "sessionPlan"
	| "rsvpNo"
	| "goalRequest"
	| "progress";
export const notificationPreferenceOptions = [
	{ key: "messages", label: "Group messages" },
	{ key: "directMessages", label: "Direct messages" },
	{ key: "coachMessages", label: "Staff messages", staff: true },
	{ key: "feedback", label: "Coaching feedback" },
	{ key: "shoutouts", label: "Shoutouts" },
	{ key: "announcements", label: "Announcements" },
	{ key: "events", label: "Events & registration" },
	{ key: "videos", label: "Video clips" },
	{ key: "documents", label: "Team documents" },
	{ key: "lineups", label: "Published lineups" },
	{ key: "plans", label: "Session plans" },
	{ key: "rsvpNo", label: "Not-attending replies", staff: true },
	{ key: "goalRequests", label: "Goal change requests", staff: true },
	{ key: "progress", label: "Player progress", staff: true },
] as const;
export type NotificationPreference =
	(typeof notificationPreferenceOptions)[number]["key"];
export type NotificationPreferences = Record<NotificationPreference, boolean>;
export const defaultNotificationPreferences: NotificationPreferences = {
	messages: true,
	directMessages: true,
	coachMessages: true,
	feedback: true,
	shoutouts: true,
	announcements: true,
	events: true,
	videos: true,
	documents: true,
	lineups: true,
	plans: true,
	rsvpNo: true,
	goalRequests: true,
	progress: true,
};
export const resolvedNotificationPreferences = (
	stored?: Partial<NotificationPreferences>,
): NotificationPreferences => ({
	messages: stored?.messages ?? true,
	events: stored?.events ?? true,
	feedback: stored?.feedback ?? true,
	announcements: stored?.announcements ?? true,
	videos: stored?.videos ?? true,
	documents: stored?.documents ?? true,
	rsvpNo: stored?.rsvpNo ?? true,
	goalRequests: stored?.goalRequests ?? true,
	progress: stored?.progress ?? true,
	directMessages: stored?.directMessages ?? stored?.messages ?? true,
	coachMessages: stored?.coachMessages ?? stored?.messages ?? true,
	shoutouts: stored?.shoutouts ?? stored?.feedback ?? true,
	lineups: stored?.lineups ?? stored?.events ?? true,
	plans: stored?.plans ?? stored?.events ?? true,
});
export const notificationPreferenceFor = (
	kind: "messages" | "events" | "feedback" | "announcements",
	topic?: NotificationTopic,
): NotificationPreference => {
	if (topic === "directMessage") return "directMessages";
	if (topic === "coachMessage") return "coachMessages";
	if (topic === "chatAnnouncement") return "announcements";
	if (topic === "shoutout") return "shoutouts";
	if (topic === "video") return "videos";
	if (topic === "document") return "documents";
	if (topic === "lineup") return "lineups";
	if (topic === "sessionPlan") return "plans";
	if (topic === "rsvpNo") return "rsvpNo";
	if (topic === "goalRequest") return "goalRequests";
	if (topic === "progress") return "progress";
	return kind;
};
