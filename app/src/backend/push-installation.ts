export const createInstallationReader = ({
	read,
	write,
	create,
}: {
	read: () => Promise<string | undefined>;
	write: (id: string) => Promise<void>;
	create: () => string;
}): (() => Promise<string>) => {
	const state: { pending?: Promise<string> } = {};
	return (): Promise<string> => {
		if (state.pending) return state.pending;
		const pending = Promise.resolve()
			.then(async (): Promise<string> => {
				const existing = await read();
				if (existing) return existing;
				const id = create();
				await write(id);
				return id;
			})
			.finally((): void => {
				if (state.pending === pending) state.pending = undefined;
			});
		state.pending = pending;
		return pending;
	};
};
