import { disabledConversation } from "./conversation-policy";

export const notificationPath = (path: unknown): string | undefined => {
	if (typeof path !== "string") return undefined;
	if (
		["/progress", "/club", "/schedule", "/messages?tab=notices"].includes(path)
	)
		return path;
	if (
		/^\/member\?id=[A-Za-z0-9_%.-]{1,180}&tab=(progress|feedback|shoutouts)$/.test(
			path,
		)
	)
		return path;
	if (/^\/session\?event=[A-Za-z0-9_%~.-]{1,400}$/.test(path)) return path;
	if (
		/^\/session\?event=[A-Za-z0-9_%~.-]{1,400}&tab=(overview|coaching|people)(&part=[A-Za-z0-9_%~.-]{1,180})?$/.test(
			path,
		)
	)
		return path;
	if (/^\/resources\?id=[A-Za-z0-9_%.-]{1,180}$/.test(path)) return path;
	if (!/^\/(conversation|session)\?id=[A-Za-z0-9_%.-]{1,180}$/.test(path))
		return undefined;
	if (path.startsWith("/conversation?id=")) {
		try {
			if (
				disabledConversation(
					decodeURIComponent(path.slice("/conversation?id=".length)),
				)
			)
				return undefined;
		} catch {
			return undefined;
		}
	}
	return path;
};
