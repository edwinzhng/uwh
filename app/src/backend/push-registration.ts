type DeviceToken = { type: string; data: unknown };
type Registration = {
	installationId: string;
	token: string;
	platform: "ios" | "android";
};
type Options<Token extends DeviceToken, Value> = {
	read: (token?: Token) => Promise<Value | undefined>;
	register: (registration: Value) => Promise<void>;
	unregister: () => Promise<void>;
};
type Controller<Token> = {
	refresh: (token?: Token) => Promise<void>;
	stop: () => void;
	resume: () => Promise<void>;
};

export const createPushRegistrationController = <
	Token extends DeviceToken,
	Value = Registration,
>({
	read,
	register,
	unregister,
}: Options<Token, Value>): Controller<Token> => {
	const state: {
		active: boolean;
		generation: number;
		pending?: Promise<void>;
		queued?: Token;
		refreshQueued: boolean;
		lastToken?: string;
		lastRegistration?: string;
	} = { active: true, generation: 0, refreshQueued: false };
	const synchronize = async (token?: Token): Promise<void> => {
		if (!state.active) return;
		const generation = state.generation;
		const registration = await read(token);
		if (!state.active || state.generation !== generation) return;
		const key = JSON.stringify(registration ?? "disabled");
		if (state.lastRegistration !== key) {
			if (registration) await register(registration);
			else await unregister();
			if (!state.active || state.generation !== generation) return;
			state.lastRegistration = key;
		}
		state.lastToken = registration
			? token
				? JSON.stringify(token)
				: state.lastToken
			: undefined;
	};
	const refresh = (token?: Token): Promise<void> => {
		if (!state.active) return Promise.resolve();
		if (state.pending) {
			state.refreshQueued = true;
			if (token) state.queued = token;
			return state.pending;
		}
		if (token && JSON.stringify(token) === state.lastToken)
			return Promise.resolve();
		const pending = Promise.resolve()
			.then(() => synchronize(token))
			.finally((): Promise<void> | undefined => {
				if (state.pending === pending) state.pending = undefined;
				const queued = state.queued;
				const refreshQueued = state.refreshQueued;
				state.queued = undefined;
				state.refreshQueued = false;
				if (state.active && refreshQueued) return refresh(queued);
				return undefined;
			});
		state.pending = pending;
		return pending;
	};
	return {
		refresh,
		resume: (): Promise<void> => {
			state.generation += 1;
			state.active = true;
			state.lastToken = undefined;
			state.lastRegistration = undefined;
			return refresh();
		},
		stop: (): void => {
			state.generation += 1;
			state.active = false;
			state.queued = undefined;
			state.refreshQueued = false;
		},
	};
};
