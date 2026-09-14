export type DictationState = {
	phase: "idle" | "starting" | "listening" | "stopping";
	transcript: string;
	error?: string;
};
export type SpeechEvents = {
	start: undefined;
	end: undefined;
	result: { transcript: string };
	error: { code: string };
};
export type SpeechEngine = {
	available: () => boolean;
	requestPermission: () => Promise<boolean>;
	subscribe: (
		callbacks: { [K in keyof SpeechEvents]: (value: SpeechEvents[K]) => void },
	) => () => void;
	start: () => void;
	stop: () => void;
	abort: () => void;
};
export type DictationSession = {
	start: () => Promise<void>;
	stop: () => void;
	dispose: () => void;
};
export const appendDictation = (draft: string, transcript: string): string =>
	transcript.trim()
		? `${draft}${draft && !/\s$/.test(draft) ? " " : ""}${transcript.trim()}`
		: draft;

export const dictationError = (code: string): string => {
	if (code === "not-allowed")
		return "Allow microphone and speech access in your device settings.";
	if (code === "no-speech" || code === "speech-timeout")
		return "No speech heard. Try again.";
	if (code === "network")
		return "Speech service unavailable. Check your connection.";
	if (code === "audio-capture")
		return "Microphone unavailable. Check your device settings.";
	if (code === "language-not-supported")
		return "Dictation isn’t available in this language.";
	return "Dictation stopped. You can keep typing.";
};

export const createDictationSession = (
	engine: SpeechEngine | undefined,
	onChange: (state: DictationState) => void,
): DictationSession => {
	const session: {
		state: DictationState;
		disposed: boolean;
		listeners: (() => void)[];
		timeout?: ReturnType<typeof setTimeout>;
	} = {
		state: { phase: "idle", transcript: "" },
		disposed: false,
		listeners: [],
	};
	const update = (state: DictationState): void => {
		session.state = state;
		if (!session.disposed) onChange(state);
	};
	const phase = (): DictationState["phase"] => session.state.phase;
	const cleanup = (): void => {
		clearTimeout(session.timeout);
		session.listeners.forEach((remove): void => {
			remove();
		});
		session.listeners = [];
	};
	const finish = (error?: string): void => {
		if (session.disposed || phase() === "idle") return;
		cleanup();
		update({ ...session.state, phase: "idle", error });
	};
	return {
		start: async (): Promise<void> => {
			if (session.disposed || session.state.phase !== "idle") return;
			update({ phase: "starting", transcript: "" });
			try {
				if (!engine?.available()) {
					finish(
						"Dictation isn’t supported here. Use your keyboard’s microphone or a supported browser.",
					);
					return;
				}
				const allowed = await engine.requestPermission();
				if (session.disposed || phase() !== "starting") return;
				if (!allowed) {
					finish(dictationError("not-allowed"));
					return;
				}
				session.listeners = [
					engine.subscribe({
						start: (): void => {
							if (session.state.phase === "starting")
								update({ ...session.state, phase: "listening" });
						},
						result: ({ transcript }): void => {
							if (!session.disposed && session.state.phase !== "idle")
								update({ ...session.state, transcript });
						},
						end: (): void => finish(),
						error: ({ code }): void => {
							if (session.disposed || phase() === "idle") return;
							finish(code === "aborted" ? undefined : dictationError(code));
							engine.abort();
						},
					}),
				];
				engine.start();
			} catch {
				finish(
					"Couldn’t start dictation. Check microphone access and try again.",
				);
				engine?.abort();
			}
		},
		stop: (): void => {
			if (
				session.disposed ||
				session.state.phase === "idle" ||
				session.state.phase === "stopping"
			)
				return;
			if (session.listeners.length === 0) {
				finish();
				return;
			}
			update({ ...session.state, phase: "stopping" });
			session.timeout = setTimeout((): void => {
				finish();
				engine?.abort();
			}, 8000);
			try {
				engine?.stop();
			} catch {
				finish(dictationError("interrupted"));
				engine?.abort();
			}
		},
		dispose: (): void => {
			const active = session.state.phase !== "idle";
			session.disposed = true;
			cleanup();
			if (active) engine?.abort();
		},
	};
};
