import { sha256 } from "@oslojs/crypto/sha2";

export const contentFingerprint = (value: string): string =>
	Array.from(sha256(new TextEncoder().encode(value)), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
