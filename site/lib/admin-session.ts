import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const adminSessionSeconds = 28800;
const signature = (payload: string, key: string, password: string): string =>
	createHmac("sha256", key)
		.update(JSON.stringify([payload, password]))
		.digest("hex");
export const createAdminSession = (
	key: string,
	password: string,
	now = Date.now(),
): string => {
	if (!key || !password)
		throw new Error("Website administrator is not configured.");
	const payload = `${now + adminSessionSeconds * 1000}.${randomBytes(24).toString("hex")}`;
	return `${payload}.${signature(payload, key, password)}`;
};
export const validAdminSession = (
	token: string | undefined,
	key: string,
	password: string,
	now = Date.now(),
): boolean => {
	if (
		!token ||
		!key ||
		!password ||
		!/^\d{13}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(token)
	)
		return false;
	const [expires, nonce, provided] = token.split(".");
	const remaining = Number(expires) - now;
	if (remaining <= 0 || remaining > adminSessionSeconds * 1000 || !provided)
		return false;
	return timingSafeEqual(
		Buffer.from(provided, "hex"),
		Buffer.from(signature(`${expires}.${nonce}`, key, password), "hex"),
	);
};
