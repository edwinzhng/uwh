export const inviteLifetime = 7 * 24 * 60 * 60 * 1000;
export const inviteCooldown = 60 * 1000;

export const inviteEmailError = (value: string): string | undefined => {
	const email = value.trim().toLowerCase();
	return email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
		? "Enter a valid email."
		: undefined;
};

export const inviteEmail = (value: string): string => {
	const error = inviteEmailError(value);
	if (error) throw new Error(error);
	return value.trim().toLowerCase();
};

export const inviteUrl = (
	siteUrl: string,
	id: string,
	revision: number,
): string => {
	const url = new URL("/join", siteUrl);
	url.searchParams.set("invite", id);
	url.searchParams.set("revision", String(revision));
	return url.toString();
};

export const inviteState = (
	invite: {
		state: "pending" | "accepted" | "revoked";
		expiresAt: number;
		revision: number;
	},
	revision: number,
	now: number,
): "pending" | "accepted" | "revoked" | "expired" | "replaced" =>
	invite.revision !== revision
		? "replaced"
		: invite.state !== "pending"
			? invite.state
			: invite.expiresAt <= now
				? "expired"
				: "pending";
