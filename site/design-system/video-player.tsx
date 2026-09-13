"use client";
import { type ReactElement, useEffect, useRef } from "react";

type Player = {
	setVolume: (volume: number) => void;
	playVideo: () => void;
	destroy: () => void;
};
type YouTubeApi = {
	Player: new (
		element: HTMLElement,
		options: {
			host: string;
			videoId: string;
			playerVars: { playsinline: number; rel: number; origin: string };
			events: { onReady: (event: { target: Player }) => void };
		},
	) => Player;
};
declare global {
	interface Window {
		YT?: YouTubeApi;
		onYouTubeIframeAPIReady?: () => void;
	}
}
const loadYouTube = (): Promise<YouTubeApi> => {
	if (window.YT?.Player) return Promise.resolve(window.YT);
	return new Promise((resolve) => {
		const previous = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = (): void => {
			previous?.();
			if (window.YT) resolve(window.YT);
		};
		if (
			!document.querySelector(
				'script[src="https://www.youtube.com/iframe_api"]',
			)
		) {
			const script = document.createElement("script");
			script.src = "https://www.youtube.com/iframe_api";
			document.head.append(script);
		}
	});
};
export const VideoPlayer = ({ videoId }: { videoId: string }): ReactElement => {
	const container = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const state: { disposed: boolean; player?: Player } = { disposed: false };
		void loadYouTube().then((api) => {
			if (state.disposed || !container.current) return;
			const mount = document.createElement("div");
			container.current.append(mount);
			state.player = new api.Player(mount, {
				host: "https://www.youtube-nocookie.com",
				videoId,
				playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
				events: {
					onReady: ({ target }): void => {
						target.setVolume(50);
						target.playVideo();
					},
				},
			});
		});
		return (): void => {
			state.disposed = true;
			state.player?.destroy();
		};
	}, [videoId]);
	return <div ref={container} className="youtube-player" />;
};
