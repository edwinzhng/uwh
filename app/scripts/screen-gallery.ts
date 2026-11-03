import { resolve, sep } from "node:path";
import { galleryScreen, galleryVariants } from "../review/screen-gallery";

const root = resolve(process.env.PREVIEW_DIRECTORY ?? "/tmp/uwh-screen-review");
const routes = (
	await Array.fromAsync(
		new Bun.Glob("**/*.tsx").scan(resolve(import.meta.dir, "../app")),
	)
)
	.filter(
		(path) => !path.split("/").at(-1)?.startsWith("_") && !path.startsWith("+"),
	)
	.map((path) => path.replace(/^\(tabs\)\//, "").replace(/\.tsx$/, ""));
const screens = [...new Set(routes)]
	.sort()
	.map(galleryScreen)
	.concat(galleryVariants);
const client = await Bun.build({
	entrypoints: [resolve(import.meta.dir, "../review/gallery-client.ts")],
	target: "browser",
	minify: true,
});
if (!client.success) throw new Error(client.logs.map(String).join("\n"));
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UWH screen review</title><link rel="stylesheet" href="/gallery.css"><script src="/gallery.js" defer></script><header><strong>Screen review</strong><input type="search" aria-label="Find screen" placeholder="Find screen"><select aria-label="Scenario"><option value="populated">Populated</option><option value="quiet">Quiet / empty activity</option><option value="long">Long names and copy</option></select><select aria-label="Account"><option value="alex">Admin · Family</option><option value="casey">Coach</option><option value="taylor">Player</option><option value="jamie">Guardian</option><option value="morgan">Admin</option></select><select aria-label="Viewport"><option value="phone">Phone</option><option value="desktop">Desktop</option><option value="both">Both</option></select><button id="refresh">Refresh visible</button><span id="count"></span></header><main></main><script type="application/json" id="screens">${JSON.stringify(screens).replaceAll("<", "\\u003c")}</script></html>`;
Bun.serve({
	hostname: "127.0.0.1",
	port: Number(process.env.PREVIEW_PORT ?? 4194),
	async fetch(request): Promise<Response> {
		const url = new URL(request.url);
		if (request.method !== "GET" && request.method !== "HEAD")
			return new Response("Read-only review host", { status: 405 });
		if (url.pathname === "/review")
			return new Response(html, {
				headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
			});
		if (url.pathname === "/screens.json") return Response.json(screens);
		if (url.pathname === "/gallery.js")
			return new Response(client.outputs.at(0), {
				headers: { "Content-Type": "text/javascript" },
			});
		if (url.pathname === "/gallery.css")
			return new Response(
				Bun.file(resolve(import.meta.dir, "../review/gallery.css")),
			);
		const path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
		if (!path.startsWith(`${root}${sep}`) && path !== root)
			return new Response("Invalid path", { status: 400 });
		for (const candidate of [
			path,
			`${path}.html`,
			resolve(path, "index.html"),
		]) {
			const file = Bun.file(candidate);
			if (await file.exists())
				return new Response(file, { headers: { "Cache-Control": "no-store" } });
		}
		return new Response("Page not found", { status: 404 });
	},
});
console.log(
	`Screen review: http://localhost:${process.env.PREVIEW_PORT ?? 4194}/review — ${screens.length} entries`,
);
