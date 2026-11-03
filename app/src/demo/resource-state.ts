import { atom } from "jotai";
import type { Resource } from "../domain/resources";

export const previewResources = atom<Resource[]>([
	{
		id: "demo-uploaded-video",
		clubId: "preview",
		title: "Demo uploaded video",
		description: "Generated sample clip for testing private playback.",
		kind: "video",
		audience: "players",
		personIds: ["sam"],
		fileId: "demo-video-file",
		fileName: "clip.mp4",
		fileMime: "video/mp4",
		thumbnailFileId: "demo-thumbnail-file",
		voiceFileId: "demo-voice-file",
		voiceTranscript:
			"Demonstration tone for audio playback; replace it with a recorded coaching note.",
		sessionNumber: 1,
		archived: false,
		revision: 1,
		updatedAt: 1792886500000,
	},
	{
		id: "practice-resources",
		clubId: "preview",
		title: "Practice reference (sample)",
		description: "Sample document for preview and download checks.",
		kind: "document",
		audience: "club",
		personIds: [],
		fileId: "demo-document-file",
		fileName: "practice-reference.pdf",
		fileMime: "application/pdf",
		archived: false,
		revision: 1,
		updatedAt: 1792886400000,
	},
	{
		id: "passing-clip",
		clubId: "preview",
		title: "Legacy unsupported video link",
		description:
			"Archived example of a website link that needs an uploaded or embedded video.",
		kind: "video",
		audience: "players",
		personIds: ["sam"],
		url: "https://tv.cmas.org/",
		archived: true,
		revision: 1,
		updatedAt: 1792886300000,
	},
]);
