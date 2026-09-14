import type { Id } from "../../convex/_generated/dataModel";
import {
	type AccountConnectionPurpose,
	isSocialProvider,
	type SocialProvider,
} from "../domain/social-auth";
import { connectionStorage } from "./connection-storage";

export type ConnectionAttempt = {
	requestId: Id<"accountConnections">;
	verifier: string;
	provider: SocialProvider;
	purpose: AccountConnectionPurpose;
	expiresAt: number;
};
const key = "crocs_account_connection";
const isAttempt = (value: unknown): value is ConnectionAttempt =>
	typeof value === "object" &&
	value !== null &&
	"requestId" in value &&
	typeof value.requestId === "string" &&
	"verifier" in value &&
	typeof value.verifier === "string" &&
	"provider" in value &&
	typeof value.provider === "string" &&
	isSocialProvider(value.provider) &&
	"purpose" in value &&
	(value.purpose === "link" || value.purpose === "verify") &&
	"expiresAt" in value &&
	typeof value.expiresAt === "number";

export const saveConnectionAttempt = async (
	attempt: ConnectionAttempt,
): Promise<void> => {
	await connectionStorage.setItem(key, JSON.stringify(attempt));
};
export const clearConnectionAttempt = async (): Promise<void> => {
	await connectionStorage.removeItem(key);
};
export const readConnectionAttempt = async (
	requestId: string,
): Promise<ConnectionAttempt> => {
	const stored = await connectionStorage.getItem(key);
	const value: unknown = stored ? JSON.parse(stored) : undefined;
	if (
		!isAttempt(value) ||
		value.requestId !== requestId ||
		value.expiresAt <= Date.now()
	)
		throw new Error("Connection expired. Start again from Settings.");
	return value;
};
