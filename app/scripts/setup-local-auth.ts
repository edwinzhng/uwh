const bun = process.execPath;
const run = async (
	args: string[],
): Promise<{ ok: boolean; output: string }> => {
	const process = Bun.spawn([bun, "scripts/local-convex.ts", ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [code, output] = await Promise.all([
		process.exited,
		new Response(process.stdout).text(),
	]);
	return { ok: code === 0, output };
};
if (process.env.EXPO_PUBLIC_CONVEX_URL !== "http://127.0.0.1:3210")
	throw new Error("This setup script is only for the isolated local backend.");
const existing = await run(["env", "get", "JWT_PRIVATE_KEY"]);
if (existing.ok && existing.output.trim())
	console.log("Local authentication keys already exist.");
else {
	const pair = await crypto.subtle.generateKey(
		{
			name: "RSASSA-PKCS1-v1_5",
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: "SHA-256",
		},
		true,
		["sign", "verify"],
	);
	const privateBytes = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
	const privateKey =
		"-----BEGIN PRIVATE KEY-----\n" +
		Buffer.from(privateBytes)
			.toString("base64")
			.match(/.{1,64}/g)
			?.join("\n") +
		"\n-----END PRIVATE KEY-----";
	const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
	const privateResult = await run([
		"env",
		"set",
		"JWT_PRIVATE_KEY",
		"--",
		privateKey,
	]);
	const publicResult = await run([
		"env",
		"set",
		"JWKS",
		JSON.stringify({ keys: [{ ...jwk, use: "sig" }] }),
	]);
	if (!privateResult.ok || !publicResult.ok)
		throw new Error("Could not configure local authentication.");
	console.log("Local authentication configured.");
}
const origin = await run(["env", "set", "SITE_URL", "http://127.0.0.1:4173"]);
const transport = await run(["env", "set", "AUTH_EMAIL_MODE", "local"]);
if (!origin.ok || !transport.ok)
	throw new Error("Could not configure the local email transport.");
console.log(
	"Local email verification enabled for fictional @example.test accounts.",
);
