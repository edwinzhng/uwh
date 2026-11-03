import type { Backend } from "../backend/context";

export type AuthStep =
	| "signIn"
	| "signUp"
	| "verify"
	| "reset"
	| "resetCode"
	| "resetPassword";
export type AuthFields = {
	email: string;
	name: string;
	password: string;
	confirmation: string;
	code: string;
};
type AuthParameters = Parameters<NonNullable<Backend["authenticate"]>>[0];

export const authPresentation = {
	signIn: {
		title: "Sign in",
		submit: "Sign in",
		password: true,
		confirm: false,
		code: false,
	},
	signUp: {
		title: "Create account",
		submit: "Create account",
		password: true,
		confirm: true,
		code: false,
	},
	verify: {
		title: "Verify email",
		submit: "Verify email",
		password: false,
		confirm: false,
		code: true,
	},
	reset: {
		title: "Reset password",
		submit: "Send code",
		password: false,
		confirm: false,
		code: false,
	},
	resetCode: {
		title: "Enter reset code",
		submit: "Continue",
		password: false,
		confirm: false,
		code: true,
	},
	resetPassword: {
		title: "New password",
		submit: "Reset password",
		password: true,
		confirm: true,
		code: false,
	},
} satisfies Record<
	AuthStep,
	{
		title: string;
		submit: string;
		password: boolean;
		confirm: boolean;
		code: boolean;
	}
>;

export const validateAuthStep = (
	step: AuthStep,
	fields: AuthFields,
): string | undefined => {
	const email = fields.email.trim();
	if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		return "Enter a valid email address";
	if (
		(authPresentation[step].code || step === "resetPassword") &&
		!/^\d{6}$/.test(fields.code.trim())
	)
		return "Enter the 6-digit code";
	if (authPresentation[step].password) {
		if (!fields.password) return "Enter your password";
		if (step !== "signIn" && fields.password.length < 12)
			return "Use at least 12 characters";
		if (step !== "signIn" && fields.password.length > 256)
			return "Use 256 characters or fewer";
	}
	if (authPresentation[step].confirm) {
		if (!fields.confirmation) return "Confirm your password";
		if (fields.confirmation !== fields.password) return "Passwords don’t match";
	}
	if (step === "signUp" && !fields.name.trim()) return "Enter your name";
	if (step === "signUp" && fields.name.trim().length > 80)
		return "Use 80 characters or fewer";
	return undefined;
};

export const authParameters = (
	step: AuthStep,
	fields: AuthFields,
): AuthParameters | undefined => {
	if (step === "resetCode") return undefined;
	return {
		flow:
			step === "verify"
				? "email-verification"
				: step === "resetPassword"
					? "reset-verification"
					: step,
		email: fields.email.trim().toLowerCase(),
		...(step === "signIn" || step === "signUp"
			? { password: fields.password }
			: {}),
		...(step === "resetPassword"
			? { newPassword: fields.password, code: fields.code.trim() }
			: {}),
		...(step === "verify" ? { code: fields.code.trim() } : {}),
		...(step === "signUp" ? { name: fields.name.trim() } : {}),
	};
};

export const authBackStep = (step: AuthStep): AuthStep =>
	step === "resetPassword"
		? "resetCode"
		: step === "resetCode"
			? "reset"
			: "signIn";

export const isResetCodeFailure = (message: string): boolean =>
	/could not verify code|invalid (?:or expired )?code|expired.*code|incorrect email or password|check your email and code/i.test(
		message,
	);
