import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { getSpeechEngine } from "../backend/speech-engine";
import { useAppInactive } from "../design-system";
import {
	appendDictation,
	createDictationSession,
	type DictationSession,
	type DictationState,
} from "../domain/dictation";

export const useDictation = (
	draft: string,
	setDraft: (text: string) => void,
): DictationState & { start: () => void; stop: () => void } => {
	const [state, setState] = useState<DictationState>({
		phase: "idle",
		transcript: "",
	});
	const session = useRef<DictationSession | undefined>(undefined);
	const active = useRef(false);
	useAppInactive((): void => {
		session.current?.dispose();
		session.current = undefined;
		active.current = false;
		setState((current) => ({ ...current, phase: "idle" }));
	});
	useFocusEffect(
		useCallback(() => {
			setState({ phase: "idle", transcript: "" });
			return (): void => {
				session.current?.dispose();
				session.current = undefined;
				active.current = false;
			};
		}, []),
	);
	return {
		...state,
		start: (): void => {
			if (active.current) return;
			active.current = true;
			session.current?.dispose();
			const initial = draft;
			session.current = createDictationSession(
				getSpeechEngine(),
				(next): void => {
					active.current = next.phase !== "idle";
					setState(next);
					setDraft(appendDictation(initial, next.transcript));
				},
			);
			void session.current.start();
		},
		stop: (): void => session.current?.stop(),
	};
};
