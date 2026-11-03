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
		title: "Practice resources",
		description: "Club reference material for rules, drills and training.",
		kind: "document",
		audience: "club",
		personIds: [],
		url: "https://www.cmas.org/hockey",
		archived: false,
		revision: 1,
		updatedAt: 1792886400000,
	},
	{
		id: "passing-clip",
		clubId: "preview",
		title: "Underwater hockey match replays",
		description:
			"Watch competition replays and discuss supporting movement with your coach.",
		kind: "video",
		audience: "players",
		personIds: ["sam"],
		url: "https://tv.cmas.org/",
		archived: false,
		revision: 1,
		updatedAt: 1792886300000,
	},
]);
