import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminSession, validAdminSession } from "./admin-session";
export const sessionToken = (): string =>
	createAdminSession(
		process.env.WEBSITE_SERVER_KEY ?? "",
		process.env.WEBSITE_ADMIN_PASSWORD ?? "",
	);
export const authorized = async (): Promise<boolean> =>
	validAdminSession(
		(await cookies()).get("website-admin")?.value,
		process.env.WEBSITE_SERVER_KEY ?? "",
		process.env.WEBSITE_ADMIN_PASSWORD ?? "",
	);
export const matchesPassword = (value: string): boolean => {
	const expected = process.env.WEBSITE_ADMIN_PASSWORD;
	if (!expected) return false;
	const a = Buffer.from(value);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
};
export const sameOrigin = (request: Request): boolean =>
	request.headers.get("origin") === new URL(request.url).origin;
