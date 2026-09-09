export const socialProviders = ["google", "apple"] as const;
export type SocialProvider = (typeof socialProviders)[number];
export type AccountConnectionPurpose = "link" | "verify";

export const providerName = (provider: SocialProvider): string =>
	provider === "google" ? "Google" : "Apple";

export const isSocialProvider = (value: string): value is SocialProvider =>
	value === "google" || value === "apple";

export const authRedirect = (destination: string, site: string): string => {
	const base = new URL(site);
	const target = new URL(destination, base);
	const native =
		target.protocol === "crocs-club:" &&
		["auth-callback", "connect-account"].includes(target.hostname) &&
		(target.pathname === "" || target.pathname === "/");
	if (
		target.username ||
		target.password ||
		(!native && target.origin !== base.origin)
	)
		throw new Error("Invalid sign-in return address.");
	return target.toString();
};

export const signInReturnPath = (path: string): string => {
	const target = new URL(path, "https://club.invalid");
	return target.origin === "https://club.invalid" &&
		!["/auth-callback", "/connect-account"].includes(target.pathname)
		? `${target.pathname}${target.search}`
		: "/account";
};
