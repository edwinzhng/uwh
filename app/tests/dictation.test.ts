import { expect, test } from "bun:test";
import {
	appendDictation,
	createDictationSession,
	type DictationState,
	type SpeechEngine,
} from "../src/domain/dictation";

const setup = (
	permission = Promise.resolve(true),
): {
	engine: SpeechEngine;
	states: DictationState[];
	calls: { start: number; stop: number; abort: number; removed: number };
	listeners: Parameters<SpeechEngine["subscribe"]>[0][];
} => {
	const states: DictationState[] = [];
	const calls = { start: 0, stop: 0, abort: 0, removed: 0 };
	const listeners: Parameters<SpeechEngine["subscribe"]>[0][] = [];
	return {
		states,
		calls,
		listeners,
		engine: {
			available: (): boolean => true,
			requestPermission: (): Promise<boolean> => permission,
			subscribe: (callbacks): (() => void) => {
				listeners.push(callbacks);
				return (): void => {
					calls.removed += 1;
				};
			},
			start: (): void => {
				calls.start += 1;
			},
			stop: (): void => {
				calls.stop += 1;
			},
			abort: (): void => {
				calls.abort += 1;
			},
		},
	};
};

test("dictation revises interim text and waits for final text after stopping", async (): Promise<void> => {
	const fixture = setup();
	const session = createDictationSession(fixture.engine, (state): void => {
		fixture.states.push(state);
	});
	await Promise.all([session.start(), session.start()]);
	expect(fixture.calls.start).toBe(1);
	const listener = fixture.listeners.at(0);
	if (!listener) throw new Error("Missing listener");
	listener.start(undefined);
	listener.result({ transcript: "see you at five" });
	listener.result({ transcript: "See you at six." });
	expect(
		appendDictation(
			"Practice update:",
			fixture.states.at(-1)?.transcript ?? "",
		),
	).toBe("Practice update: See you at six.");
	session.stop();
	expect(fixture.states.at(-1)?.phase).toBe("stopping");
	listener.result({ transcript: "See you at six tomorrow." });
	listener.end(undefined);
	expect(fixture.states.at(-1)).toEqual({
		phase: "idle",
		transcript: "See you at six tomorrow.",
		error: undefined,
	});
	expect(fixture.calls.removed).toBe(1);
	expect(appendDictation("Hello\n", "team")).toBe("Hello\nteam");
});

test("denied and unsupported dictation never starts the microphone", async (): Promise<void> => {
	const fixture = setup(Promise.resolve(false));
	await createDictationSession(fixture.engine, (state): void => {
		fixture.states.push(state);
	}).start();
	expect(fixture.states.at(-1)?.error).toContain("Allow microphone");
	expect(fixture.calls.start).toBe(0);
	await createDictationSession(undefined, (state): void => {
		fixture.states.push(state);
	}).start();
	expect(fixture.states.at(-1)?.error).toContain("isn’t supported");
});

test("leaving or cancelling while permission is pending cannot start recognition later", async (): Promise<void> => {
	for (const action of ["dispose", "stop"] as const) {
		const permission = Promise.withResolvers<boolean>();
		const fixture = setup(permission.promise);
		const session = createDictationSession(fixture.engine, (state): void => {
			fixture.states.push(state);
		});
		const starting = session.start();
		session[action]();
		const count = fixture.states.length;
		permission.resolve(true);
		await starting;
		expect(fixture.calls.start).toBe(0);
		expect(fixture.states).toHaveLength(count);
	}
});

test("errors preserve drafts and ignore late end and result events", async (): Promise<void> => {
	const fixture = setup();
	const session = createDictationSession(fixture.engine, (state): void => {
		fixture.states.push(state);
	});
	await session.start();
	const listener = fixture.listeners.at(0);
	if (!listener) throw new Error("Missing listener");
	listener.result({ transcript: "Bring fins" });
	listener.error({ code: "network" });
	listener.end(undefined);
	listener.result({ transcript: "stale" });
	expect(fixture.states.at(-1)?.error).toContain("connection");
	expect(fixture.states.at(-1)?.transcript).toBe("Bring fins");
	expect(fixture.calls.abort).toBe(1);
	session.dispose();
	const count = fixture.states.length;
	listener.start(undefined);
	listener.end(undefined);
	expect(fixture.states).toHaveLength(count);
});
