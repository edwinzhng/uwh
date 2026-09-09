export const notificationPath = (path: unknown): string | undefined => {
	if (typeof path !== "string") return undefined;
	if (
		["/progress", "/club", "/schedule", "/messages?tab=notices"].includes(path)
	)
		return path;
	if (/^\/member\?id=[A-Za-z0-9_%.-]{1,180}&tab=progress$/.test(path))
		return path;
	if (/^\/session\?event=[A-Za-z0-9_%~.-]{1,400}$/.test(path)) return path;
	return /^\/(conversation|session)\?id=[A-Za-z0-9_%.-]{1,180}$/.test(path)
		? path
		: undefined;
};
