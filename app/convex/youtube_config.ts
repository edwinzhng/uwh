export const youtubeOAuthClient = (
	environment: Record<string, string | undefined> = process.env,
): { clientId: string; clientSecret: string } | undefined => {
	const dedicated = Boolean(
		environment.YOUTUBE_CLIENT_ID || environment.YOUTUBE_CLIENT_SECRET,
	);
	const clientId = dedicated
		? environment.YOUTUBE_CLIENT_ID
		: environment.AUTH_GOOGLE_ID;
	const clientSecret = dedicated
		? environment.YOUTUBE_CLIENT_SECRET
		: environment.AUTH_GOOGLE_SECRET;
	return clientId && clientSecret ? { clientId, clientSecret } : undefined;
};
