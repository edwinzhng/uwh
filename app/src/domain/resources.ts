import { documentContainerMime } from "./resource-documents";
import { videoEmbedUrl } from "./video-embed";

export type ResourceKind = "document" | "video";
export const resourceCategories = [
	{ value: "rules", label: "Rules" },
	{ value: "formations", label: "Formations" },
	{ value: "drills", label: "Drills" },
	{ value: "announcements", label: "Announcements" },
	{ value: "other", label: "Other" },
] as const;
export type ResourceCategory = (typeof resourceCategories)[number]["value"];
export type ResourceFilePurpose = "document" | "video" | "thumbnail" | "voice";
export type ResourceFileSlot = "primary" | "thumbnail" | "voice";
export type ResourceAudience = "club" | "coaches" | "players" | "programs";
export const initialResourceAudience = (personId?: string): ResourceAudience =>
	personId ? "players" : "coaches";
export type ResourceActor = {
	clubId: string;
	personId: string;
	children: string[];
	coachPrograms: string[];
	admin: boolean;
	programIds?: string[];
};
export type ResourceDraft = {
	title: string;
	description: string;
	kind: ResourceKind;
	audience: ResourceAudience;
	personIds: string[];
	programIds?: string[];
	url?: string;
	fileId?: string;
	category?: ResourceCategory;
	sessionNumber?: number;
	thumbnailFileId?: string;
	voiceFileId?: string;
	voiceTranscript?: string;
};
export type Resource = ResourceDraft & {
	id: string;
	clubId: string;
	archived: boolean;
	revision: number;
	createdAt?: number;
	updatedAt: number;
	fileName?: string;
	fileMime?: string;
	personNames?: Record<string, string>;
};
export const resourceTimestamps = (
	previous: Pick<Resource, "createdAt" | "updatedAt"> | undefined,
	now: number,
): { createdAt: number; updatedAt: number } => ({
	createdAt: previous?.createdAt ?? previous?.updatedAt ?? now,
	updatedAt: now,
});
export type ResourceComment = {
	id: string;
	authorId: string;
	authorName: string;
	body: string;
	createdAt: number;
};
export type ResourceFile = {
	id: string;
	name: string;
	mime: string;
	size: number;
	purpose?: ResourceFilePurpose;
};
export type ResourceFilters = {
	kind: "all" | ResourceKind;
	archived: boolean;
	search: string;
	personId?: string;
	category?: "all" | ResourceCategory;
};
export const resourceLimits = {
	bytes: 10 * 1024 * 1024,
	videoBytes: 50 * 1024 * 1024,
	thumbnailBytes: 2 * 1024 * 1024,
	voiceBytes: 10 * 1024 * 1024,
	voiceSeconds: 120,
	title: 120,
	description: 2000,
	comment: 2000,
	tags: 50,
	pendingFiles: 10,
	fileLifetime: 24 * 60 * 60 * 1000,
} as const;
export const canManageResources = (actor: ResourceActor): boolean =>
	actor.admin || actor.coachPrograms.length > 0;
export const canReadResource = (
	actor: ResourceActor,
	resource: Pick<Resource, "clubId" | "audience" | "personIds" | "programIds">,
): boolean =>
	actor.clubId === resource.clubId &&
	(canManageResources(actor) ||
		resource.audience === "club" ||
		(resource.audience === "players" &&
			[actor.personId, ...actor.children].some((id) =>
				resource.personIds.includes(id),
			)) ||
		(resource.audience === "programs" &&
			resource.programIds?.some((id) => actor.programIds?.includes(id)) ===
				true));
export const resourceHouseholdPrograms = (
	actor: Pick<ResourceActor, "personId" | "children">,
	members: { id: string; archived?: boolean; programs: string[] }[],
): string[] => [
	...new Set(
		members
			.filter(
				(member) =>
					!member.archived &&
					[actor.personId, ...actor.children].includes(member.id),
			)
			.flatMap((member) => member.programs),
	),
];
export const resourceUrl = (value: string): string | undefined => {
	try {
		const candidate = new URL(value);
		return candidate.protocol === "https:" &&
			!candidate.username &&
			!candidate.password
			? candidate.href
			: undefined;
	} catch {
		return undefined;
	}
};
export const validateResource = (draft: ResourceDraft): string | undefined => {
	if (!draft.title.trim() || draft.title.trim().length > resourceLimits.title)
		return "Enter a title of 1–120 characters.";
	if (draft.description.length > resourceLimits.description)
		return "Keep the description under 2,000 characters.";
	if (draft.personIds.length > resourceLimits.tags)
		return "Tag up to 50 players.";
	if (new Set(draft.personIds).size !== draft.personIds.length)
		return "Choose each player only once.";
	if (draft.audience === "players" && !draft.personIds.length)
		return "Choose the players who can view this resource.";
	if (draft.audience === "programs" && !draft.programIds?.length)
		return "Choose the programs who can view this resource.";
	if (
		(draft.programIds?.length ?? 0) > 100 ||
		new Set(draft.programIds).size !== (draft.programIds?.length ?? 0)
	)
		return "Choose each program once, up to 100 programs.";
	if (draft.audience !== "programs" && draft.programIds?.length)
		return "Use program selections with the selected-program audience.";
	if (Boolean(draft.fileId) === Boolean(draft.url?.trim()))
		return "Add a link or upload one file.";
	if (
		draft.kind !== "video" &&
		(draft.thumbnailFileId ||
			draft.voiceFileId ||
			draft.voiceTranscript ||
			draft.sessionNumber !== undefined)
	)
		return "Video thumbnails and voice notes belong to video clips.";
	if (draft.kind === "video" && draft.category)
		return "Choose document categories only for documents.";
	if (
		draft.voiceTranscript &&
		draft.voiceTranscript.length > resourceLimits.description
	)
		return "Keep the voice transcript under 2,000 characters.";
	if (
		draft.sessionNumber !== undefined &&
		(!Number.isInteger(draft.sessionNumber) ||
			draft.sessionNumber < 1 ||
			draft.sessionNumber > 9999)
	)
		return "Enter a session number from 1 to 9,999.";
	const files = [draft.fileId, draft.thumbnailFileId, draft.voiceFileId].filter(
		Boolean,
	);
	if (new Set(files).size !== files.length)
		return "Use a separate file for each media attachment.";
	if (draft.url && !resourceUrl(draft.url.trim()))
		return "Use a complete secure link beginning with https://.";
	if (draft.url && !supportedResourceLink(draft.kind, draft.url.trim()))
		return draft.kind === "video"
			? "Use a YouTube or Vimeo video link, or upload a video."
			: "Use a direct PDF or image link, or upload a document.";
	return undefined;
};
export const supportedResourceLink = (
	kind: ResourceKind,
	value: string,
): boolean => {
	const secure = resourceUrl(value);
	if (!secure) return false;
	if (kind === "video") return Boolean(videoEmbedUrl(secure));
	return /\.(?:pdf|png|jpe?g|webp|gif)$/i.test(new URL(secure).pathname);
};
export const validateResourceComment = (body: string): string | undefined =>
	!body.trim() || body.trim().length > resourceLimits.comment
		? "Write a comment of 1–2,000 characters."
		: undefined;
export const sameResourceDraft = (
	left: ResourceDraft,
	right: ResourceDraft,
): boolean =>
	left.title.trim() === right.title.trim() &&
	left.description.trim() === right.description.trim() &&
	left.kind === right.kind &&
	left.audience === right.audience &&
	JSON.stringify((left.programIds ?? []).slice().sort()) ===
		JSON.stringify((right.programIds ?? []).slice().sort()) &&
	left.fileId === right.fileId &&
	(left.category ?? (left.kind === "document" ? "other" : undefined)) ===
		(right.category ?? (right.kind === "document" ? "other" : undefined)) &&
	left.sessionNumber === right.sessionNumber &&
	left.thumbnailFileId === right.thumbnailFileId &&
	left.voiceFileId === right.voiceFileId &&
	(left.voiceTranscript?.trim() ?? "") ===
		(right.voiceTranscript?.trim() ?? "") &&
	(left.url ? resourceUrl(left.url.trim()) : undefined) ===
		(right.url ? resourceUrl(right.url.trim()) : undefined) &&
	JSON.stringify(left.personIds.slice().sort()) ===
		JSON.stringify(right.personIds.slice().sort());
export const resourceMatches = (
	resource: Resource,
	filters: ResourceFilters,
): boolean =>
	resource.archived === filters.archived &&
	(filters.kind === "all" || resource.kind === filters.kind) &&
	(!filters.category ||
		filters.category === "all" ||
		(resource.kind === "document" &&
			(resource.category ?? "other") === filters.category)) &&
	(!filters.personId || resource.personIds.includes(filters.personId)) &&
	`${resource.title} ${resource.description} ${resource.voiceTranscript ?? ""} ${Object.values(resource.personNames ?? {}).join(" ")}`
		.toLowerCase()
		.includes(filters.search.trim().toLowerCase());
export const documentMime = (bytes: Uint8Array): string | undefined => {
	const startsWith = (values: number[]): boolean =>
		values.every((value, index) => bytes.at(index) === value);
	if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
	if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
		return "image/png";
	if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
	if (
		startsWith([0x52, 0x49, 0x46, 0x46]) &&
		[0x57, 0x45, 0x42, 0x50].every(
			(value, index) => bytes.at(index + 8) === value,
		)
	)
		return "image/webp";
	return undefined;
};
export const resourceFileLimit = (purpose: ResourceFilePurpose): number =>
	purpose === "video"
		? resourceLimits.videoBytes
		: purpose === "thumbnail"
			? resourceLimits.thumbnailBytes
			: purpose === "voice"
				? resourceLimits.voiceBytes
				: resourceLimits.bytes;
export const validateStoredResourceMedia = (
	expected: { size: number; mime: string; purpose: ResourceFilePurpose },
	actual: { size: number; mime?: string },
): string | undefined =>
	!actual.size ||
	actual.size !== expected.size ||
	actual.size > resourceFileLimit(expected.purpose)
		? "Media upload was incomplete or too large."
		: actual.mime !== expected.mime
			? "The uploaded media signature changed."
			: undefined;
export const resourceMediaMime = (
	bytes: Uint8Array,
	purpose: ResourceFilePurpose,
	declaredMime = "",
	fileName = "",
): string | undefined => {
	const signature = (value: string, offset = 0): boolean =>
		[...value].every(
			(character, index) =>
				bytes.at(offset + index) === character.charCodeAt(0),
		);
	const starts = (values: number[]): boolean =>
		values.every((value, index) => bytes.at(index) === value);
	if (purpose === "document")
		return (
			documentMime(bytes) ??
			documentContainerMime(bytes, declaredMime, fileName)
		);
	if (purpose === "thumbnail") {
		const image = documentMime(bytes);
		return image?.startsWith("image/") ? image : undefined;
	}
	if (signature("ftyp", 4)) {
		if (purpose === "voice") return "audio/mp4";
		return signature("qt  ", 8) ? "video/quicktime" : "video/mp4";
	}
	if (starts([0x1a, 0x45, 0xdf, 0xa3]))
		return purpose === "video" ? "video/webm" : "audio/webm";
	if (purpose === "voice") {
		if (signature("RIFF") && signature("WAVE", 8)) return "audio/wav";
		if (signature("OggS")) return "audio/ogg";
		if (
			signature("ID3") ||
			(bytes.at(0) === 0xff &&
				((bytes.at(1) ?? 0) & 0xe0) === 0xe0 &&
				declaredMime.split(";").at(0) === "audio/mpeg")
		)
			return "audio/mpeg";
	}
	return undefined;
};
export const resourceSlotFileId = (
	resource: ResourceDraft,
	slot: ResourceFileSlot,
): string | undefined =>
	slot === "primary"
		? resource.fileId
		: slot === "thumbnail"
			? resource.thumbnailFileId
			: resource.voiceFileId;
export const resourceFileIds = (resource: ResourceDraft): string[] =>
	[resource.fileId, resource.thumbnailFileId, resource.voiceFileId].flatMap(
		(id) => (id ? [id] : []),
	);
export const youtubeThumbnail = (value?: string): string | undefined => {
	const url = value && resourceUrl(value) ? new URL(value) : undefined;
	const host = url?.hostname.toLowerCase();
	const id =
		host === "youtu.be"
			? url?.pathname.slice(1)
			: host === "youtube.com" ||
					host === "www.youtube.com" ||
					host === "m.youtube.com"
				? (url?.searchParams.get("v") ??
					url?.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.at(1))
				: undefined;
	return id && /^[\w-]{11}$/.test(id)
		? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
		: undefined;
};
export const resourceByteRange = (
	header: string | null,
	size: number,
): { start: number; end: number } | undefined => {
	if (!header) return undefined;
	const match = /^bytes=(\d*)-(\d*)$/.exec(header);
	if (!match || (!match.at(1) && !match.at(2)))
		throw new Error("Invalid byte range.");
	const start = match.at(1)
		? Number(match.at(1))
		: Math.max(0, size - Number(match.at(2)));
	const end =
		match.at(1) && match.at(2)
			? Math.min(size - 1, Number(match.at(2)))
			: size - 1;
	if (
		!Number.isSafeInteger(start) ||
		!Number.isSafeInteger(end) ||
		start < 0 ||
		start >= size ||
		end < start
	)
		throw new Error("Invalid byte range.");
	return { start, end };
};
