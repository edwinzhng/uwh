"use client";
import Image from "next/image";
import type { ReactElement } from "react";
import { useState } from "react";
import { VideoPlayer } from "./video-player";

export const Video = ({
	videoId,
	poster,
	title,
}: {
	videoId: string;
	poster: string;
	title: string;
}): ReactElement => {
	const [playing, setPlaying] = useState(false);

	return (
		<div className="video-section">
			<div className="club-video">
				{playing ? (
					<VideoPlayer videoId={videoId} />
				) : (
					<button
						type="button"
						className="video-preview"
						onClick={() => setPlaying(true)}
						aria-label={`Play ${title} video`}
					>
						<Image
							src={poster}
							alt=""
							fill
							sizes="(max-width: 700px) 100vw, 90vw"
							className="video-poster-image"
						/>
						<strong className="video-poster-title">{title}</strong>
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
				href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
				target="_blank"
				rel="noopener noreferrer"
			>
				Watch on YouTube
			</a>
		</div>
	);
};
