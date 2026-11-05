import { CompactEncrypt, compactDecrypt } from "jose";

const encryptionKey = (encoded: string | undefined): Uint8Array => {
	if (!encoded || !/^[A-Za-z0-9+/]{43}=$/.test(encoded))
		throw new Error("Apple authorization storage is not configured.");
	const key = Uint8Array.from(atob(encoded), (character) =>
		character.charCodeAt(0),
	);
	if (key.length !== 32)
		throw new Error("Apple authorization storage is not configured.");
	return key;
};

export const encryptAppleToken = async (
	token: string,
	key = process.env.AUTH_APPLE_TOKEN_KEY,
): Promise<string> => {
	if (!token || token.length > 16000)
		throw new Error("Apple did not return a usable authorization token.");
	return new CompactEncrypt(new TextEncoder().encode(token))
		.setProtectedHeader({ alg: "dir", enc: "A256GCM" })
		.encrypt(encryptionKey(key));
};

export const decryptAppleToken = async (
	token: string,
	key = process.env.AUTH_APPLE_TOKEN_KEY,
): Promise<string> => {
	const { plaintext } = await compactDecrypt(token, encryptionKey(key), {
		keyManagementAlgorithms: ["dir"],
		contentEncryptionAlgorithms: ["A256GCM"],
	});
	return new TextDecoder().decode(plaintext);
};
