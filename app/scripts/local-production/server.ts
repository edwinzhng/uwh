import { randomBytes } from "node:crypto";
import { resolve, sep } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { localCommand, localFunction } from "./backend";
import { copyRoot } from "./config";
import {
	type LocalAccount,
	localAccounts,
	localAppOrigin,
	localBackendOrigin,
	localPickerOrigin,
} from "./policy";

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local production copy</title><style>body{font:16px system-ui;background:#111811;color:#eef2d9;max-width:760px;margin:48px auto;padding:0 24px}h1{font-size:28px}p,output{color:#b0beb0;line-height:1.6}input{display:block;box-sizing:border-box;width:100%;padding:14px;background:#1c251c;border:1px solid #526252;color:inherit;border-radius:8px;font:inherit}main{display:grid;gap:12px;margin:24px 0}button{font:inherit;text-align:left;padding:16px;background:#273426;border:1px solid #526252;color:inherit;border-radius:24px;cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid #d8ff63;outline-offset:4px}button:disabled{opacity:.5;cursor:wait}</style><h1>Local production copy</h1><p>Changes stay in the isolated local database. Select a copied account to open the app with its actual permissions.</p><label>Find an account<input type="search" autocomplete="off"></label><main></main><output aria-live="polite">Loading accounts…</output><script type="module" src="/client.js"></script></html>`;

const copiedAccounts = async (): Promise<LocalAccount[]> => {
	const manifest: unknown = await Bun.file(
		resolve(copyRoot, "snapshot-manifest.json"),
	).json();
	if (
		typeof manifest !== "object" ||
		manifest === null ||
		!("loginAccountIds" in manifest) ||
		!Array.isArray(manifest.loginAccountIds)
	)
		throw new Error("The copied account manifest is unavailable.");
	const ids = new Set(
		manifest.loginAccountIds.filter(
			(id: unknown): id is string => typeof id === "string",
		),
	);
	const users: unknown = JSON.parse(
		await localCommand([
			"data",
			"users",
			"--format",
			"json",
			"--limit",
			"10000",
		]),
	);
	return localAccounts(users).filter((account) => ids.has(account.id));
};

export const startLocalServers = async (): Promise<void> => {
	const secret = randomBytes(32).toString("hex");
	const built = await Bun.build({
		entrypoints: [resolve(import.meta.dir, "client.ts")],
		target: "browser",
		minify: true,
	});
	const script = built.outputs.at(0);
	if (!built.success || !script)
		throw new Error("The local account picker could not build.");
	const clientScript = await script.text();
	const webRoot = resolve(copyRoot, "web");
	const headers = {
		"Cache-Control": "no-store",
		"X-Content-Type-Options": "nosniff",
		"Content-Security-Policy":
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
	};
	Bun.serve({
		hostname: "127.0.0.1",
		port: 4302,
		fetch: async (request): Promise<Response> => {
			const url = new URL(request.url);
			if (
				request.headers.get("host") !== new URL(localPickerOrigin).host ||
				(request.headers.get("origin") &&
					request.headers.get("origin") !== localPickerOrigin)
			)
				return new Response("Forbidden", { status: 403 });
			if (url.pathname === "/" && request.method === "GET")
				return new Response(html, {
					headers: {
						...headers,
						"Content-Type": "text/html",
						"Set-Cookie": `uwh_local_picker=${secret}; HttpOnly; SameSite=Strict; Path=/`,
					},
				});
			if (url.pathname === "/client.js" && request.method === "GET")
				return new Response(clientScript, {
					headers: { ...headers, "Content-Type": "text/javascript" },
				});
			if (
				!request.headers
					.get("cookie")
					?.split(";")
					.some((cookie) => cookie.trim() === `uwh_local_picker=${secret}`)
			)
				return new Response("Reload the picker", { status: 403, headers });
			if (url.pathname === "/api/accounts" && request.method === "GET")
				return Response.json(await copiedAccounts(), { headers });
			if (
				url.pathname === "/api/session" &&
				request.method === "POST" &&
				request.headers.get("origin") === localPickerOrigin
			) {
				const body: unknown = await request.json();
				const id =
					typeof body === "object" &&
					body !== null &&
					"id" in body &&
					typeof body.id === "string"
						? body.id
						: undefined;
				const accounts = await copiedAccounts();
				const account = accounts.find((entry) => entry.id === id);
				if (!account)
					return new Response("Choose a copied account", {
						status: 400,
						headers,
					});
				await localFunction("local_email:prepareAccountSwitch", {
					email: account.email,
				});
				const auth = new ConvexHttpClient(localBackendOrigin, {
					logger: false,
				});
				await auth.action(api.auth.signIn, {
					provider: "email-code",
					params: { email: account.email },
				});
				const code = await localFunction("local_email:latest", {
					email: account.email,
				});
				if (typeof code !== "string" || !/^\d{6}$/.test(code))
					return new Response("Local sign-in unavailable", {
						status: 503,
						headers,
					});
				return Response.json({ email: account.email, code }, { headers });
			}
			return new Response("Not found", { status: 404, headers });
		},
		error: (): Response =>
			new Response(
				"Local account service failed. Check the private local logs.",
				{ status: 500, headers },
			),
	});
	Bun.serve({
		hostname: "127.0.0.1",
		port: 4300,
		fetch: async (request): Promise<Response> => {
			if (request.method !== "GET" && request.method !== "HEAD")
				return new Response("Method not allowed", { status: 405 });
			const path = resolve(
				webRoot,
				`.${decodeURIComponent(new URL(request.url).pathname)}`,
			);
			if (path !== webRoot && !path.startsWith(`${webRoot}${sep}`))
				return new Response("Forbidden", { status: 403 });
			for (const candidate of [
				path === webRoot ? resolve(webRoot, "index.html") : path,
				`${path}.html`,
				resolve(path, "index.html"),
			]) {
				const file = Bun.file(candidate);
				if (await file.exists())
					return new Response(request.method === "HEAD" ? undefined : file, {
						headers: {
							"Content-Type": file.type,
							"Cache-Control": "no-store",
							"X-Content-Type-Options": "nosniff",
						},
					});
			}
			return new Response("Not found", { status: 404 });
		},
	});
	console.log(`Connected local app: ${localAppOrigin}`);
	console.log(`Local account picker: ${localPickerOrigin}`);
};
