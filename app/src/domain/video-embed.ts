export const videoEmbedUrl = (input: string): string | undefined => {
	const url = parseVideoUrl(input);
	if (!url || url.protocol !== "https:") return;
	const host = url.hostname.toLowerCase();
	const parts = url.pathname.split("/").filter(Boolean);
	const youtube =
		host === "youtu.be"
			? parts.at(0)
			: ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
				? (url.searchParams.get("v") ??
					(["shorts", "embed"].includes(parts.at(0) ?? "")
						? parts.at(1)
						: undefined))
				: undefined;
	if (youtube && /^[\w-]{11}$/.test(youtube))
		return `https://www.youtube-nocookie.com/embed/${youtube}`;
	const vimeo = ["vimeo.com", "www.vimeo.com"].includes(host)
		? parts.at(0)
		: host === "player.vimeo.com" && parts.at(0) === "video"
			? parts.at(1)
			: undefined;
	const hash =
		url.searchParams.get("h") ??
		(host === "player.vimeo.com" ? undefined : parts.at(1));
	if (vimeo && /^\d+$/.test(vimeo))
		return `https://player.vimeo.com/video/${vimeo}${hash && /^[a-f0-9]+$/i.test(hash) ? `?h=${hash}` : ""}`;
	return;
};
const parseVideoUrl = (input: string): URL | undefined => {
	try {
		return new URL(input);
	} catch {
		return;
	}
};
