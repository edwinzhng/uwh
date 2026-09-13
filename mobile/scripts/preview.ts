import { resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "../dist");
const resolveRequestPath = (url: string): string | undefined => {
	try {
		return resolve(root, `.${decodeURIComponent(new URL(url).pathname)}`);
	} catch {
		return undefined;
	}
};

const serve = async (request: Request): Promise<Response> => {
	if (request.method !== "GET" && request.method !== "HEAD")
		return new Response("Method not allowed", { status: 405 });
	const path = resolveRequestPath(request.url);
	if (!path || (path !== root && !path.startsWith(`${root}${sep}`)))
		return new Response("Invalid path", { status: 400 });
	const options =
		path === root
			? [resolve(root, "index.html")]
			: [path, `${path}.html`, resolve(path, "index.html")];
	for (const option of options) {
		const file = Bun.file(option);
		if (await file.exists())
			return new Response(request.method === "HEAD" ? undefined : file, {
				headers: {
					"Content-Type": file.type,
					"Cache-Control": "no-store",
					"X-Content-Type-Options": "nosniff",
				},
			});
	}
	return new Response("Page not found", { status: 404 });
};

if (!(await Bun.file(resolve(root, "index.html")).exists()))
	throw new Error(
		"Build the preview first with bun expo export --platform web.",
	);
const server = Bun.serve({ hostname: "127.0.0.1", port: 4173, fetch: serve });
console.log(`UWH Club preview: ${server.url}`);
