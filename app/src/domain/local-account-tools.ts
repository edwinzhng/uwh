export const localAccountToolsAllowed = (
	enabled: string | undefined,
	backendUrl: string | undefined,
): boolean => enabled === "true" && backendUrl === "http://127.0.0.1:3330";

export type LocalSignInMessage = {
	type: "uwh-local-sign-in";
	requestId: string;
	email: string;
	code: string;
};
export const localSignInMessage = (
	value: unknown,
): LocalSignInMessage | undefined => {
	if (
		typeof value !== "object" ||
		value === null ||
		!("type" in value) ||
		value.type !== "uwh-local-sign-in" ||
		!("requestId" in value) ||
		typeof value.requestId !== "string" ||
		!("email" in value) ||
		typeof value.email !== "string" ||
		!("code" in value) ||
		typeof value.code !== "string" ||
		!/^\d{6}$/.test(value.code)
	)
		return;
	return {
		type: value.type,
		requestId: value.requestId,
		email: value.email,
		code: value.code,
	};
};

export const localAccountSwitchAllowed = (settings: {
	enabled?: string;
	backendUrl?: string;
	outboundDisabled?: string;
	emailMode?: string;
}): boolean =>
	localAccountToolsAllowed(settings.enabled, settings.backendUrl) &&
	settings.outboundDisabled === "true" &&
	settings.emailMode === "local";
