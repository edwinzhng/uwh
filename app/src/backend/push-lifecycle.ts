const controllers = new Map<() => void, () => Promise<void>>();

export const trackPushLifecycle = (
	stop: () => void,
	resume: () => Promise<void>,
): (() => void) => {
	controllers.set(stop, resume);
	return (): void => {
		controllers.delete(stop);
		stop();
	};
};
export const stopPushLifecycles = (): (() => void) => {
	const stopped = [...controllers];
	for (const [stop] of stopped) stop();
	return (): void => {
		for (const [stop, resume] of stopped)
			if (controllers.get(stop) === resume) void resume().catch((): void => {});
	};
};
export const signOutAfterPushCleanup = async ({
	cleanup,
	signOut,
	timeoutMs = 1500,
}: {
	cleanup: (signal: AbortSignal) => Promise<unknown>;
	signOut: () => Promise<void>;
	timeoutMs?: number;
}): Promise<void> => {
	const resume = stopPushLifecycles();
	const abort = new AbortController();
	const timer: { id?: ReturnType<typeof setTimeout> } = {};
	try {
		await Promise.race([
			Promise.resolve()
				.then(() => cleanup(abort.signal))
				.catch((): void => {}),
			new Promise<void>((resolve) => {
				timer.id = setTimeout((): void => {
					abort.abort();
					resolve();
				}, timeoutMs);
			}),
		]);
	} finally {
		clearTimeout(timer.id);
		abort.abort();
	}
	try {
		await signOut();
	} catch (error) {
		resume();
		throw error;
	}
};
