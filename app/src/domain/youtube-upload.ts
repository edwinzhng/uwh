import { videoEmbedUrl } from "./video-embed";

export const youtubeVideoId = (url?: string): string | undefined => {
	const embed = url ? videoEmbedUrl(url) : undefined;
	return embed?.startsWith("https://www.youtube-nocookie.com/embed/")
		? embed.split("/").at(-1)
		: undefined;
};

export const youtubeUploadLimit = 1024 * 1024 * 1024;
export const youtubeChunkSize = 4 * 1024 * 1024;

export const validateYoutubeUpload = (
	size: number,
	mime: string,
): string | undefined =>
	!Number.isSafeInteger(size) || size < 1 || size > youtubeUploadLimit
		? "Choose a video under 1 GB."
		: !["video/mp4", "video/quicktime", "video/webm"].includes(mime)
			? "Choose an MP4, MOV or WebM video."
			: undefined;

export const youtubeReceivedBytes = (
	range: string | null,
	size: number,
): number => {
	if (!range) return 0;
	const match = /^bytes=0-(\d+)$/.exec(range);
	const received = match ? Number(match.at(1)) + 1 : Number.NaN;
	if (!Number.isSafeInteger(received) || received < 1 || received > size)
		throw new Error("YouTube returned an invalid upload position. Try again.");
	return received;
};

export const youtubeSessionUrl = (value: string): string => {
	const url = new URL(value);
	if (
		url.protocol !== "https:" ||
		url.username !== "" ||
		url.password !== "" ||
		url.port !== "" ||
		url.hostname !== "www.googleapis.com" ||
		url.pathname !== "/upload/youtube/v3/videos" ||
		!url.searchParams.get("upload_id")
	)
		throw new Error("YouTube returned an invalid upload session.");
	return url.toString();
};
