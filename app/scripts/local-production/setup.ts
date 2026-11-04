import { chmod, mkdir, readdir, rm, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { localCommand } from "./backend";
import {
	appRoot,
	copyRoot,
	type LocalInstance,
	readInstance,
	run,
	runtimeRoot,
} from "./config";
import { localAppOrigin, localBackendOrigin, localSiteOrigin } from "./policy";
import { prepareSnapshot } from "./prepare-snapshot";
import { verifySnapshot } from "./verify";

export const createRuntime = async (): Promise<void> => {
	await rm(runtimeRoot, { recursive: true, force: true });
	await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
	const archive = Bun.spawn(["git", "archive", "HEAD"], {
		cwd: resolve(appRoot, ".."),
		stdout: "pipe",
		stderr: "pipe",
	});
	const extract = Bun.spawn(["tar", "-x", "-C", runtimeRoot], {
		stdin: archive.stdout,
		stdout: "pipe",
		stderr: "pipe",
	});
	if ((await archive.exited) !== 0 || (await extract.exited) !== 0)
		throw new Error("Could not prepare the committed local runtime.");
	for (const directory of ["node_modules", "app/node_modules"]) {
		const destination = resolve(runtimeRoot, directory);
		await mkdir(resolve(destination, ".."), { recursive: true });
		const present = await readdir(destination).then(
			(): boolean => true,
			(): boolean => false,
		);
		if (!present)
			await run(["cp", "-cR", resolve(appRoot, "..", directory), destination]);
	}
	const nested = resolve(runtimeRoot, "app/node_modules/node_modules");
	await unlink(nested).catch((error: NodeJS.ErrnoException): void => {
		if (error.code !== "ENOENT") throw error;
	});
};

export const startBackend = async (): Promise<LocalInstance> => {
	await mkdir(copyRoot, { recursive: true, mode: 0o700 });
	const exists = await Bun.file(resolve(copyRoot, "instance.json")).exists();
	if (!exists) {
		const binaryRoot = resolve(homedir(), ".cache/convex/binaries");
		const candidates = (await readdir(binaryRoot))
			.filter((name) => name.startsWith("precompiled-"))
			.sort()
			.reverse();
		const version = candidates.at(0);
		if (!version)
			throw new Error(
				"Start the existing local Convex stack once to install its backend binary.",
			);
		const binary = resolve(binaryRoot, version, "convex-local-backend");
		const secret = Buffer.from(
			crypto.getRandomValues(new Uint8Array(32)),
		).toString("hex");
		const instance = "uwh-production-copy";
		const adminKey = await run([
			binary,
			"keygen",
			"admin-key",
			"--instance-name",
			instance,
			"--instance-secret",
			secret,
		]);
		await Bun.write(
			resolve(copyRoot, "instance.json"),
			JSON.stringify({ adminKey, secret, binary, instance }),
		);
		await chmod(resolve(copyRoot, "instance.json"), 0o600);
	}
	const config = await readInstance();
	const healthy = await fetch(`${localBackendOrigin}/version`).then(
		(response): boolean => response.ok,
		(): boolean => false,
	);
	if (!healthy) {
		await mkdir(resolve(copyRoot, "storage"), { recursive: true, mode: 0o700 });
		const child = Bun.spawn(
			[
				config.binary,
				"--interface",
				"127.0.0.1",
				"--port",
				"3330",
				"--site-proxy-port",
				"3331",
				"--instance-name",
				config.instance,
				"--instance-secret",
				config.secret,
				"--convex-origin",
				localBackendOrigin,
				"--convex-site",
				localSiteOrigin,
				"--local-storage",
				resolve(copyRoot, "storage"),
				"--disable-beacon",
				resolve(copyRoot, "database.sqlite3"),
			],
			{
				stdout: Bun.file(resolve(copyRoot, "backend.log")),
				stderr: Bun.file(resolve(copyRoot, "backend-errors.log")),
			},
		);
		child.unref();
		await Bun.write(resolve(copyRoot, "backend.pid"), String(child.pid));
		for (const attempt of Array.from({ length: 60 }, (_, index) => index)) {
			if (
				await fetch(`${localBackendOrigin}/version`).then(
					(response): boolean => response.ok,
					(): boolean => false,
				)
			)
				break;
			if (attempt === 59)
				throw new Error("The isolated backend did not become ready.");
			await Bun.sleep(250);
		}
	}
	await Bun.write(
		resolve(copyRoot, "instance.env"),
		`CONVEX_SELF_HOSTED_URL=${localBackendOrigin}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${config.adminKey}\n`,
	);
	await chmod(resolve(copyRoot, "instance.env"), 0o600);
	return config;
};

export const configureBackend = async (accounts: string[]): Promise<void> => {
	for (const [name, value] of Object.entries({
		OUTBOUND_DELIVERY_DISABLED: "true",
		PUSH_DELIVERY_ENABLED: "false",
		WEB_PUSH_DELIVERY_ENABLED: "false",
		AUTH_EMAIL_MODE: "local",
		AUTH_LOCAL_EMAIL_ALLOWLIST: accounts.join(","),
		LOCAL_ACCOUNT_SWITCH_ENABLED: "true",
		SITE_URL: localAppOrigin,
	}))
		await localCommand(["env", "set", name, "--", value]);
	const existing = await localCommand(["env", "list"]);
	if (!existing.includes("JWT_PRIVATE_KEY=")) {
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
		const bytes = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
		const privateKey = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(bytes)
			.toString("base64")
			.match(/.{1,64}/g)
			?.join("\n")}\n-----END PRIVATE KEY-----`;
		const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
		await localCommand(["env", "set", "JWT_PRIVATE_KEY", "--", privateKey]);
		await localCommand([
			"env",
			"set",
			"JWKS",
			"--",
			JSON.stringify({ keys: [{ ...jwk, use: "sig" }] }),
		]);
	}
};

export const deployRuntime = async (): Promise<void> => {
	await run(
		[
			process.execPath,
			resolve(appRoot, "node_modules/convex/bin/main.js"),
			"deploy",
			"--env-file",
			resolve(copyRoot, "instance.env"),
			"--yes",
		],
		resolve(runtimeRoot, "app"),
	);
};

export const importSnapshot = async (snapshot: string): Promise<void> => {
	const prepared = await prepareSnapshot(snapshot);
	await configureBackend(prepared.accounts);
	await deployRuntime();
	await localCommand(["import", "--replace-all", "--yes", prepared.snapshot]);
	await verifySnapshot(prepared.snapshot);
	console.log(
		`Imported ${Object.keys(prepared.counts).length} table groups with ${prepared.accounts.length} copied login accounts. Delivery remains disabled.`,
	);
};

export const buildLocalWeb = async (): Promise<void> => {
	const child = Bun.spawn(
		[
			"./node_modules/.bin/expo",
			"export",
			"--platform",
			"web",
			"--max-workers",
			"2",
			"--output-dir",
			resolve(copyRoot, "web"),
		],
		{
			cwd: resolve(runtimeRoot, "app"),
			env: {
				...process.env,
				TMPDIR: resolve(copyRoot, "cache"),
				EXPO_NO_DOTENV: "1",
				EXPO_PUBLIC_CONVEX_URL: localBackendOrigin,
				EXPO_PUBLIC_CONVEX_SITE_URL: localSiteOrigin,
				EXPO_PUBLIC_DEMO_MODE: "false",
				EXPO_PUBLIC_REVIEW_MODE: "false",
				EXPO_PUBLIC_LOCAL_ACCOUNT_TOOLS: "true",
			},
			stdout: Bun.file(resolve(copyRoot, "web-build.log")),
			stderr: Bun.file(resolve(copyRoot, "web-build-errors.log")),
		},
	);
	if ((await child.exited) !== 0)
		throw new Error("Local web build failed. See the private build logs.");
};
