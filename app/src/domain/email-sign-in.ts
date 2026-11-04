export const signInEmailError = (email: string): string | undefined =>
	email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
		? undefined
		: "Enter a valid email address.";
export const validEmailSignInToken = (token: unknown): token is string =>
	typeof token === "string" && /^[A-Za-z0-9]{32}$/.test(token);

export const validEmailSignInCode = (code: string): boolean =>
	/^\d{6}$/.test(code.trim());
