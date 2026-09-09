import { requireOptionalNativeModule } from "expo";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";
import type { SpeechEngine } from "../domain/dictation";
import { adaptSpeechEngine } from "./speech-engine-adapter";

export const getSpeechEngine = (): SpeechEngine | undefined => {
	const module = requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>(
		"ExpoSpeechRecognition",
	);
	return module
		? adaptSpeechEngine(
				module,
				(): Promise<boolean> =>
					module.requestPermissionsAsync().then((result) => result.granted),
			)
		: undefined;
};
