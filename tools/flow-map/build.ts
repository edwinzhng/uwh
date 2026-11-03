import { features, screens } from "./flows";

const escapeHtml = (text: string): string =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll('"', "&quot;");
const slug = (text: string): string =>
	text
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replace(/-$/, "");
const personaId = (text: string): string =>
	text === "Player with family" ? "family" : text.toLowerCase();
const image = (id: string): string => {
	const screen = screens[id];
	if (!screen) throw new Error(`Missing screen ${id}`);
	return `<figure data-screen="${id}" data-route="${escapeHtml(`/app${screen.route}`)}"><figcaption>${escapeHtml(screen.label)}</figcaption><div class="frame"><img loading="lazy" decoding="async" width="390" height="844" src="/screens/${id}-phone.jpg" alt="${escapeHtml(screen.label)} — app rendering with fictional review data"></div><button type="button" data-live>Interact</button></figure>`;
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UWH user flows</title><meta name="description" content="UWH app user flows grouped by feature and persona."><link rel="stylesheet" href="/style.css"><script src="/client.js" defer></script></head><body><aside><a class="brand" href="#">UWH / User flows</a><nav aria-label="Features">${features.map((feature) => `<a href="#${slug(feature.name)}">${escapeHtml(feature.name)}</a>`).join("")}</nav></aside><main><header><div class="filters" role="group" aria-label="Show persona">${["All", "Player", "Player with family", "Coach", "Admin"].map((name) => `<button data-persona="${personaId(name)}" aria-pressed="${name === "All"}">${name}</button>`).join("")}</div><label class="view">Screens <select id="viewport" aria-label="Screen viewport"><option value="phone">Phone</option><option value="desktop">Desktop</option></select></label></header>${features.map((feature) => `<section id="${slug(feature.name)}"><h1>${escapeHtml(feature.name)}</h1>${feature.personas.map((persona) => `<div class="persona" data-persona="${personaId(persona.name)}"><h2>${persona.name}</h2>${persona.flows.map((flow) => `<details><summary>${escapeHtml(flow.text)}</summary>${flow.screens.length ? `<div class="screens">${flow.screens.map(image).join("")}</div>` : ""}</details>`).join("")}</div>`).join("")}</section>`).join("")}<footer>Mapped from current app source · 3 November 2026 · Renderings use fictional review data. Expand a flow for its available pages and sheets. Some form steps share a rendering; external and unimplemented steps have none. Admin coverage focuses on the requested checklist.</footer></main></body></html>`;
await Bun.write(`${import.meta.dir}/dist/index.html`, html);
await Bun.write(
	`${import.meta.dir}/dist/style.css`,
	Bun.file(`${import.meta.dir}/style.css`),
);
await Bun.write(
	`${import.meta.dir}/dist/flows.json`,
	JSON.stringify({ features, screens }, undefined, 2),
);
const build = await Bun.build({
	entrypoints: [`${import.meta.dir}/client.ts`],
	outdir: `${import.meta.dir}/dist`,
	naming: "client.js",
	target: "browser",
	minify: true,
});
if (!build.success) throw new Error(build.logs.map(String).join("\n"));
console.log(
	JSON.stringify({
		features: features.length,
		flows: features.flatMap((f) => f.personas.flatMap((p) => p.flows)).length,
		screens: Object.keys(screens).length,
	}),
);
