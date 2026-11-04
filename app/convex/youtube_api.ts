import { youtubeReceivedBytes } from "../src/domain/youtube-upload";

export const youtubeCredentials = (): {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
} => {
	if (process.env.OUTBOUND_DELIVERY_DISABLED === "true")
		throw new Error("YouTube delivery is disabled in this environment.");
	const clientId = process.env.YOUTUBE_CLIENT_ID;
	const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
	const site = process.env.CONVEX_SITE_URL;
	if (!clientId || !clientSecret || !site)
		throw new Error("YouTube uploads need administrator setup first.");
	return { clientId, clientSecret, redirectUri: `${site}/youtube/callback` };
};
export const youtubeToken = async (refreshToken: string): Promise<string> => {
	const { clientId, clientSecret } = youtubeCredentials();
	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		}),
	});
	if (!response.ok)
		throw new Error("Ask an administrator to reconnect YouTube, then retry.");
	const data: { access_token?: string } = await response.json();
	if (!data.access_token) throw new Error("YouTube authorization failed.");
	return data.access_token;
};
export type YoutubePosition = { received: number; url?: string };
export const youtubePosition = async (
	response: Response,
	size: number,
	validatePublication = true,
): Promise<YoutubePosition> => {
	if (response.status === 308)
		return {
			received: youtubeReceivedBytes(response.headers.get("Range"), size),
		};
	if (!response.ok)
		throw new Error(
			response.status === 404 || response.status === 410
				? "This YouTube upload expired. Choose the video again."
				: "YouTube could not accept this upload. Retry to resume.",
		);
	const data: {
		id?: string;
		status?: { uploadStatus?: string; privacyStatus?: string };
	} = await response.json();
	if (
		!data.id ||
		!/^[\w-]{11}$/.test(data.id) ||
		(validatePublication &&
			(data.status?.privacyStatus !== "unlisted" ||
				["failed", "rejected", "deleted"].includes(
					data.status?.uploadStatus ?? "",
				)))
	)
		throw new Error(
			"YouTube could not publish this unlisted video. Check the club channel and retry.",
		);
	return { received: size, url: `https://www.youtube.com/watch?v=${data.id}` };
};
export const deleteYoutubeVideo = async (
	token: string,
	videoId: string,
): Promise<void> => {
	const response = await fetch(
		`https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(videoId)}`,
		{ method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
	);
	if (!response.ok && response.status !== 404)
		throw new Error(
			"YouTube video deletion failed. Reconnect the channel and retry cleanup.",
		);
};

export const youtubeCompletedVideo = async (
	token: string,
	sessionUrl: string,
	size: number,
): Promise<string | undefined> => {
	const response = await fetch(sessionUrl, {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Range": `bytes */${size}`,
			"Content-Length": "0",
		},
	});
	if ([308, 404, 410].includes(response.status)) return undefined;
	const result = await youtubePosition(response, size, false);
	return result.url
		? (new URL(result.url).searchParams.get("v") ?? undefined)
		: undefined;
};
