export const localAccountToolsAllowed = (
	enabled: string | undefined,
	backendUrl: string | undefined,
): boolean => enabled === "true" && backendUrl === "http://127.0.0.1:3330";

export type LocalSignInHandoff = { email: string; code: string };

export const localSignInHandoffPath = "/local-login";

export const localSignInHandoffHash = (handoff: LocalSignInHandoff): string =>
	`#${new URLSearchParams(handoff).toString()}`;

export const localSignInHandoff = (
	hash: string,
): LocalSignInHandoff | undefined => {
	const params = new URLSearchParams(hash.replace(/^#/, ""));
	const email = params.get("email")?.trim();
	const code = params.get("code");
	return email && code && /^\d{6}$/.test(code) ? { email, code } : undefined;
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
