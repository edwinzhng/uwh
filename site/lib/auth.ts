import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
export const sessionToken = (): string =>
	createHmac("sha256", process.env.WEBSITE_SERVER_KEY || "unconfigured")
		.update(`website-admin:${Math.floor(Date.now() / 86400000)}`)
		.digest("hex");
export const authorized = async (): Promise<boolean> =>
	Boolean(process.env.WEBSITE_SERVER_KEY) &&
	(await cookies()).get("website-admin")?.value === sessionToken();
export const matchesPassword = (value: string): boolean => {
	const expected = process.env.WEBSITE_ADMIN_PASSWORD;
	if (!expected) return false;
	const a = Buffer.from(value);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
};
export const sameOrigin = (request: Request): boolean =>
	request.headers.get("origin") === new URL(request.url).origin;
