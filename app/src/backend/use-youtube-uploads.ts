import {
	type RequestForQueries,
	useAction,
	useMutation,
	useQueries,
} from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useMemo, useRef } from "react";
import { Linking } from "react-native";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { newId, useApp } from "../demo/app-state";
import { youtubeChunkSize } from "../domain/youtube-upload";
import type { PickedYoutubeVideo } from "./pick-youtube-video";

export type YoutubeUploader = {
	configured: boolean;
	channelName?: string;
	connect: () => Promise<void>;
	upload: (
		video: PickedYoutubeVideo,
		progress: (percent: number) => void,
	) => Promise<string>;
};
export const useYoutubeUploads = (token?: string): YoutubeUploader => {
	const { account } = useApp();
	const canManage = account.admin || account.coachPrograms.length > 0;
	const queries = useMemo((): RequestForQueries => {
		if (!canManage) return {};
		return { status: { query: api.youtube.status, args: {} } };
	}, [canManage]);
	const result: {
		status?: FunctionReturnType<typeof api.youtube.status> | Error;
	} = useQueries(queries);
	const status = result.status instanceof Error ? undefined : result.status;
	const authorize = useAction(api.youtube_actions.authorize);
	const reserve = useMutation(api.youtube.reserve);
	const position = useAction(api.youtube_actions.position);
	const pending = useRef(
		new WeakMap<
			PickedYoutubeVideo,
			{ key: string; id?: Id<"youtubeUploads"> }
		>(),
	);
	return {
		configured: status?.configured ?? false,
		channelName: status?.channelName,
		connect: async (): Promise<void> => {
			const url = await authorize({});
			await Linking.openURL(url);
		},
		upload: async (video, progress): Promise<string> => {
			const site =
				process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
				process.env.EXPO_PUBLIC_CONVEX_URL?.replace(
					".convex.cloud",
					".convex.site",
				).replace(":3210", ":3211");
			if (!token || !site) throw new Error("Sign in before uploading videos.");
			const entry = pending.current.get(video) ?? { key: newId() };
			pending.current.set(video, entry);
			const id =
				entry.id ??
				(await reserve({
					key: entry.key,
					name: video.name,
					mime: video.mime,
					size: video.size,
				}));
			entry.id = id;
			const state = { result: await position({ id }) };
			progress(Math.floor((state.result.received / video.size) * 100));
			while (!state.result.url) {
				const offset = state.result.received;
				const response = await fetch(
					`${site}/youtube/upload?id=${encodeURIComponent(id)}`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": video.mime,
							"X-Upload-Offset": String(offset),
						},
						body: await video.read(
							offset,
							Math.min(offset + youtubeChunkSize, video.size),
						),
					},
				);
				if (!response.ok)
					throw new Error(
						"Upload interrupted. Keep this form open and save again to resume.",
					);
				const result: { received: number; url?: string } =
					await response.json();
				if (
					!Number.isSafeInteger(result.received) ||
					result.received <= offset ||
					result.received > video.size
				)
					throw new Error(
						"Upload paused. Save again to check its progress and resume.",
					);
				state.result = result;
				progress(Math.floor((result.received / video.size) * 100));
			}
			return state.result.url;
		},
	};
};
