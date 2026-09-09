import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";
import type { SpeechEngine } from "../domain/dictation";

export const adaptSpeechEngine = (
	module: ExpoSpeechRecognitionModuleType,
	requestPermission: () => Promise<boolean>,
): SpeechEngine => ({
	available: (): boolean => module.isRecognitionAvailable(),
	requestPermission,
	subscribe: (callbacks): (() => void) => {
		const subscriptions = [
			module.addListener("start", (): void => callbacks.start(undefined)),
			module.addListener("end", (): void => callbacks.end(undefined)),
			module.addListener("result", (event): void =>
				callbacks.result({ transcript: event.results.at(0)?.transcript ?? "" }),
			),
			module.addListener("error", (event): void =>
				callbacks.error({ code: event.error }),
			),
		];
		return (): void =>
			subscriptions.forEach((subscription): void => {
				subscription.remove();
			});
	},
	start: (): void =>
		module.start({
			lang: Intl.DateTimeFormat().resolvedOptions().locale,
			interimResults: true,
			continuous: false,
			maxAlternatives: 1,
			addsPunctuation: true,
			recordingOptions: { persist: false },
		}),
	stop: (): void => module.stop(),
	abort: (): void => module.abort(),
});
