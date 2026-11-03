export const captureVideoThumbnail = (
	uri: string,
	seconds = 0,
): Promise<Blob> =>
	new Promise((resolve, reject) => {
		const video = document.createElement("video");
		const timer = setTimeout(
			(): void =>
				finish(
					undefined,
					"This video could not be decoded. Choose a thumbnail image instead.",
				),
			15000,
		);
		const completed = { value: false };
		const finish = (blob?: Blob, error?: string): void => {
			if (completed.value) return;
			completed.value = true;
			clearTimeout(timer);
			video.pause();
			video.removeAttribute("src");
			video.load();
			if (blob) resolve(blob);
			else reject(new Error(error ?? "Could not capture this video frame."));
		};
		video.muted = true;
		video.preload = "auto";
		video.crossOrigin = "anonymous";
		video.onloadedmetadata = (): void => {
			video.currentTime = Math.min(
				Math.max(0, seconds),
				Math.max(0, video.duration - 0.05),
			);
		};
		const capture = (): void => {
			if (!video.videoWidth || video.readyState < 2) return;
			const canvas = document.createElement("canvas");
			canvas.width = Math.min(640, video.videoWidth);
			canvas.height = Math.max(
				1,
				Math.round((canvas.width * video.videoHeight) / video.videoWidth),
			);
			const context = canvas.getContext("2d");
			if (!context) {
				finish();
				return;
			}
			try {
				context.drawImage(video, 0, 0, canvas.width, canvas.height);
				canvas.toBlob(
					(blob): void => finish(blob ?? undefined),
					"image/jpeg",
					0.7,
				);
			} catch {
				finish(
					undefined,
					"Frame capture is unavailable for this video. Choose an image instead.",
				);
			}
		};
		video.onseeked = capture;
		video.onloadeddata = (): void => {
			if (seconds <= 0) capture();
		};
		video.onerror = (): void =>
			finish(
				undefined,
				"This video could not be decoded. Choose a thumbnail image instead.",
			);
		video.src = uri;
		video.load();
	});
