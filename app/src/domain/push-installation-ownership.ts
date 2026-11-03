export const canUnregisterInstallation = (
	userId: string | undefined,
	expectedUserId?: string,
): boolean => Boolean(userId && (!expectedUserId || userId === expectedUserId));
