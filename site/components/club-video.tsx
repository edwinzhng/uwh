"use client";
import { atom, useAtom } from "jotai";
import type { ReactElement } from "react";
import { YouTubePlayer } from "./youtube-player";

const playingAtom = atom(false);

export const ClubVideo = (): ReactElement => {
	const [playing, setPlaying] = useAtom(playingAtom);

	return (
		<div className="video-section">
			<div className="club-video">
				{playing ? (
					<YouTubePlayer />
				) : (
					<button
						type="button"
						className="video-preview"
						onClick={() => setPlaying(true)}
						aria-label="Play underwater hockey video"
					>
						<strong className="video-poster-title">Underwater hockey</strong>
						<span className="video-play">
							<svg
								width="28"
								height="28"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
							>
								<path d="M8 4v16l13-8z" />
							</svg>
						</span>
						<span className="video-caption">
							<span>Play video</span>
						</span>
					</button>
				)}
			</div>
			<a
				className="video-source"
				href="https://www.youtube.com/watch?v=SAukrpTEvZA"
				target="_blank"
				rel="noopener noreferrer"
			>
				Watch on YouTube
			</a>
		</div>
	);
};
