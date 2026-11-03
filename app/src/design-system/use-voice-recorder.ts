import type { AudioRecorder } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { requireNativeFeature } from "../platform/native-feature";
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
		Platform.OS === "web" &&
		typeof MediaRecorder !== "undefined" &&
		MediaRecorder.isTypeSupported("audio/mp4")
			? "audio/mp4"
			: "audio/webm";
	const recorderRef = useRef<AudioRecorder | undefined>(undefined);
	const audioRef = useRef<typeof import("expo-audio") | undefined>(undefined);
	const active = useRef(true);
	const [recording, setRecording] = useState(false);
	const [seconds, setSeconds] = useState(0);
	useAppInactive((): void => {
		const recorder = recorderRef.current;
		if (recorder?.isRecording)
			void recorder
				.stop()
				.then(() =>
					audioRef.current?.setAudioModeAsync({ allowsRecording: false }),
				)
				.then((): void => setRecording(false))
				.catch((): void => undefined);
	});
	useEffect(() => {
		if (!recording) return;
		const interval = setInterval((): void => {
			const status = recorderRef.current?.getStatus();
			if (!status) return;
			setSeconds(Math.floor(status.durationMillis / 1000));
			setRecording(status.isRecording);
		}, 500);
		return (): void => clearInterval(interval);
	}, [recording]);
	useEffect(() => {
		active.current = true;
		return (): void => {
			active.current = false;
			const recorder = recorderRef.current;
			const audio = audioRef.current;
			if (!recorder) return;
			void (recorder.isRecording ? recorder.stop() : Promise.resolve())
				.then(() => audio?.setAudioModeAsync({ allowsRecording: false }))
				.finally((): void => recorder.release())
				.catch((): void => undefined);
		};
	}, []);
	return {
		recording,
		seconds,
		start: async (): Promise<void> => {
			requireNativeFeature("ExpoAudio", "audio");
			const audio = await import("expo-audio");
			audioRef.current = audio;
			const permission =
				await audio.AudioModule.requestRecordingPermissionsAsync();
			if (!active.current) throw new Error("Recording closed. Try again.");
			if (!permission.granted)
				throw new Error(
					"Allow microphone access to record a voice note, or attach an audio file.",
				);
			await audio.setAudioModeAsync({
				allowsRecording: true,
				playsInSilentMode: true,
			});
			if (!active.current) {
				await audio.setAudioModeAsync({ allowsRecording: false });
				throw new Error("Recording closed. Try again.");
			}
			const options = {
				...audio.RecordingPresets.HIGH_QUALITY,
				web: { ...audio.RecordingPresets.HIGH_QUALITY.web, mimeType: webMime },
			};
			const recorder =
				recorderRef.current ??
				new audio.AudioModule.AudioRecorder({
					extension: options.extension,
					sampleRate: options.sampleRate,
					numberOfChannels: options.numberOfChannels,
					bitRate: options.bitRate,
					...(Platform.OS === "ios"
						? options.ios
						: Platform.OS === "android"
							? options.android
							: options.web),
				});
			recorderRef.current = recorder;
			await recorder.prepareToRecordAsync();
			recorder.record({ forDuration: 120 });
			setSeconds(0);
			setRecording(true);
		},
		stop: async (): Promise<CapturedVoice> => {
			const recorder = recorderRef.current;
			const audio = audioRef.current;
			if (!recorder || !audio) throw new Error("Record a voice note first.");
			if (recorder.isRecording) await recorder.stop();
			setRecording(false);
			await audio.setAudioModeAsync({
				allowsRecording: false,
				playsInSilentMode: true,
			});
			if (!recorder.uri)
				throw new Error("This recording was not saved. Try recording again.");
			return {
				uri: recorder.uri,
				name:
					Platform.OS === "web" && webMime === "audio/webm"
						? "voice-note.webm"
						: "voice-note.m4a",
				mime: Platform.OS === "web" ? webMime : "audio/mp4",
			};
		},
		discard: async (): Promise<void> => {
			const recorder = recorderRef.current;
			if (!recorder) return;
			if (recorder.isRecording) await recorder.stop();
			setRecording(false);
			await audioRef.current?.setAudioModeAsync({ allowsRecording: false });
			if (recorder.uri) await discardVoice(recorder.uri);
		},
	};
};
