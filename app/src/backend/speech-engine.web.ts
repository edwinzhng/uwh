import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import type { SpeechEngine } from "../domain/dictation";
import { adaptSpeechEngine } from "./speech-engine-adapter";

export const getSpeechEngine = (): SpeechEngine =>
	adaptSpeechEngine(
		ExpoSpeechRecognitionModule,
		(): Promise<boolean> => Promise.resolve(true),
	);
