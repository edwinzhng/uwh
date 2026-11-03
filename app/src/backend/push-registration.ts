type DeviceToken = { type: string; data: unknown };
type Registration = {
	installationId: string;
	token: string;
	platform: "ios" | "android";
};
type Options<Token extends DeviceToken> = {
	read: (token?: Token) => Promise<Registration | undefined>;
	register: (registration: Registration) => Promise<void>;
	unregister: () => Promise<void>;
};
type Controller<Token> = {
	refresh: (token?: Token) => Promise<void>;
	stop: () => void;
};

export const createPushRegistrationController = <Token extends DeviceToken>({
	read,
	register,
	unregister,
}: Options<Token>): Controller<Token> => {
	const state: {
		active: boolean;
		pending?: Promise<void>;
		queued?: Token;
		lastToken?: string;
		lastRegistration?: string;
	} = { active: true };
	const synchronize = async (token?: Token): Promise<void> => {
		if (!state.active) return;
		const registration = await read(token);
		if (!state.active) return;
		const key = JSON.stringify(registration ?? "disabled");
		if (state.lastRegistration !== key) {
			if (registration) await register(registration);
			else await unregister();
			if (!state.active) return;
			state.lastRegistration = key;
		}
		if (token) state.lastToken = JSON.stringify(token);
	};
	const refresh = (token?: Token): Promise<void> => {
		if (!state.active) return Promise.resolve();
		if (state.pending) {
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
				state.queued = undefined;
				if (state.active && queued) return refresh(queued);
				return undefined;
			});
		state.pending = pending;
		return pending;
	};
	return {
		refresh,
		stop: (): void => {
			state.active = false;
			state.queued = undefined;
		},
	};
};
