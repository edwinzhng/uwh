import {
	AudioModule,
	RecordingPresets,
	setAudioModeAsync,
	useAudioRecorder,
	useAudioRecorderState,
} from "expo-audio";
import { useEffect } from "react";
import { discardVoice } from "./discard-voice";
import type { CapturedVoice } from "./media-types";
import { useAppInactive } from "./use-app-inactive";

export const useVoiceRecorder = (): {
	recording: boolean;
	seconds: number;
	start: () => Promise<void>;
	stop: () => Promise<CapturedVoice>;
	discard: () => Promise<void>;
} => {
	const webMime =
		typeof MediaRecorder !== "undefined" &&
		MediaRecorder.isTypeSupported("audio/mp4")
			? "audio/mp4"
			: "audio/webm";
	const recorder = useAudioRecorder({
		...RecordingPresets.HIGH_QUALITY,
		web: { ...RecordingPresets.HIGH_QUALITY.web, mimeType: webMime },
	});
	const state = useAudioRecorderState(recorder);
	useAppInactive((): void => {
		if (recorder.isRecording)
			void recorder
				.stop()
				.then(() => setAudioModeAsync({ allowsRecording: false }))
				.catch((): void => undefined);
	});
	useEffect(
		() => (): void => {
			void setAudioModeAsync({ allowsRecording: false }).catch(
				(): void => undefined,
			);
		},
		[],
	);
	return {
		recording: state.isRecording,
		seconds: Math.floor(state.durationMillis / 1000),
		start: async (): Promise<void> => {
			const permission = await AudioModule.requestRecordingPermissionsAsync();
			if (!permission.granted)
				throw new Error(
					"Allow microphone access to record a voice note, or attach an audio file.",
				);
			await setAudioModeAsync({
				allowsRecording: true,
				playsInSilentMode: true,
			});
			await recorder.prepareToRecordAsync();
			recorder.record({ forDuration: 120 });
		},
		stop: async (): Promise<CapturedVoice> => {
			if (recorder.isRecording) await recorder.stop();
			await setAudioModeAsync({
				allowsRecording: false,
				playsInSilentMode: true,
			});
			if (!recorder.uri)
				throw new Error("This recording was not saved. Try recording again.");
			return {
				uri: recorder.uri,
				name: webMime === "audio/webm" ? "voice-note.webm" : "voice-note.m4a",
				mime: webMime,
			};
		},
		discard: async (): Promise<void> => {
			if (recorder.isRecording) await recorder.stop();
			await setAudioModeAsync({ allowsRecording: false });
			if (recorder.uri) await discardVoice(recorder.uri);
		},
	};
};
