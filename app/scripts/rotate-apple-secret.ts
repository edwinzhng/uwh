import { createPublicKey } from "node:crypto";
import { importPKCS8, jwtVerify, SignJWT } from "jose";

const deployment = "brainy-albatross-874";
const serviceId = "com.uwhclub.auth";
const teamId = "9Q6V32KZ6G";
const keyId = "2KP7X7UL74";
const keyPath = process.argv.at(2);

if (!keyPath) throw new Error("Pass the private Apple .p8 key file path.");

const runConvex = async (args: string[], input?: string): Promise<string> => {
	const child = Bun.spawn(
		["bunx", "convex", "env", ...args, "--deployment-name", deployment],
		{
			cwd: new URL("..", import.meta.url).pathname,
			stdin: input === undefined ? "ignore" : new TextEncoder().encode(input),
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [output, , exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (exitCode !== 0)
		throw new Error(
			"Convex credential operation failed; no secrets were logged.",
		);
	return output.trim();
};

const siteUrl = await runConvex(["get", "SITE_URL"]);
if (siteUrl !== "https://app.calgaryuwh.com")
	throw new Error(
		"Production SITE_URL does not match the expected app origin.",
	);

const privateKeyPem = await Bun.file(keyPath).text();
const signingKey = await importPKCS8(privateKeyPem, "ES256");
const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + 180 * 24 * 60 * 60;
const secret = await new SignJWT({})
	.setProtectedHeader({ alg: "ES256", kid: keyId })
	.setIssuer(teamId)
	.setAudience("https://appleid.apple.com")
	.setSubject(serviceId)
	.setIssuedAt(issuedAt)
	.setExpirationTime(expiresAt)
	.sign(signingKey);

await jwtVerify(secret, createPublicKey(privateKeyPem), {
	issuer: teamId,
	audience: "https://appleid.apple.com",
	subject: serviceId,
	algorithms: ["ES256"],
});

await runConvex(
	["set", "--force"],
	`AUTH_APPLE_ID=${serviceId}\nAUTH_APPLE_SECRET=${secret}\n`,
);

const configuredSecret = await runConvex(["get", "AUTH_APPLE_SECRET"]);
if (configuredSecret !== secret)
	throw new Error("Production did not return the installed Apple credential.");

console.log(
	`Apple sign-in credentials verified on ${deployment}; expires ${new Date(expiresAt * 1000).toISOString()}.`,
);
