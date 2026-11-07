import { jwtVerify, SignJWT } from "jose";

const audience = "resource-video-playback";
const signingKey = (): Uint8Array => {
	const secret = process.env.JWT_PRIVATE_KEY;
	if (!secret) throw new Error("Video playback signing is unavailable.");
	return new TextEncoder().encode(`${audience}:${secret}`);
};

export const issuePlayback = (
	sessionId: string,
	resourceId: string,
	fileId: string,
): Promise<string> =>
	new SignJWT({ resourceId, fileId })
		.setProtectedHeader({ alg: "HS256" })
		.setAudience(audience)
		.setSubject(sessionId)
		.setExpirationTime("1h")
		.sign(signingKey());

export const verifyPlayback = async (
	token: string,
	resourceId: string,
): Promise<{ sessionId: string; fileId: string } | undefined> => {
	try {
		const { payload } = await jwtVerify(token, signingKey(), {
			audience,
			algorithms: ["HS256"],
			requiredClaims: ["sub", "exp"],
		});
		if (
			payload.resourceId === resourceId &&
			payload.sub &&
			typeof payload.fileId === "string"
		)
			return { sessionId: payload.sub, fileId: payload.fileId };
	} catch {
		return undefined;
	}
	return undefined;
};
