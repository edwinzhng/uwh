import { resolve } from "node:path";
import { type ProductFlow, productFlows } from "../review/product-flows";
import { normalizeReviewAssets } from "./normalize-review-assets";

const previewHref = (screen: string, id: string): string => {
	const url = new URL(screen, "https://preview.invalid");
	url.searchParams.set("reviewFlow", id);
	return `/app${url.pathname}${url.search}`;
};
const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
export const flowSteps = (entry: string): string[] =>
	entry
		.split("→")
		.map((step) => step.trim())
		.filter(Boolean);
export const renderFlowCard = (flow: ProductFlow): string => {
	const id = escapeHtml(flow.id);
	const name = escapeHtml(flow.name);
	const screenshotId = encodeURIComponent(flow.id);
	const steps = flowSteps(flow.entry)
		.map(
			(step, index) =>
				`<li class="flow-step">${index ? '<span class="step-arrow" aria-hidden="true">→</span>' : ""}<span class="step-card">${escapeHtml(step)}</span></li>`,
		)
		.join("");
	return `<article id="${id}" data-flow="${id}" data-name="${name}" data-href="${escapeHtml(previewHref(flow.screen, flow.id))}"><div class="flow-row"><div class="flow-copy"><a class="flow-name" href="#${id}">${name}</a><p class="description">${escapeHtml(flow.description)}</p></div><ol class="flow-steps" role="list" aria-label="Steps for ${name}">${steps}</ol></div><details data-preview><summary aria-label="Show screen for ${name}">Show screen</summary><div class="preview-mount"></div><template><div class="preview-panel" data-viewport="phone" data-interacting="false"><div class="preview-controls"><div class="viewport-controls" role="group" aria-label="Screen size for ${name}"><button type="button" data-viewport="phone" aria-pressed="true">Phone</button><button type="button" data-viewport="desktop" aria-pressed="false">Desktop</button></div><label class="interact"><input type="checkbox" data-interact aria-label="Interact with ${name}">Interact</label></div><div class="screen"><img data-src-phone="/screenshots/${screenshotId}-phone.jpg" data-src-desktop="/screenshots/${screenshotId}-desktop.jpg" alt="${name} — real app screen, fictional sample data" decoding="async" width="390" height="844"></div></div></template></details></article>`;
};
export const renderFlowReview = (
	flows: readonly ProductFlow[] = productFlows,
): string =>
	`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Product flows rendered from the UWH app with fictional sample data."><title>UWH product flows</title><link rel="stylesheet" href="/review.css"><script src="/review.js" defer></script></head><body><main aria-label="Product flows">${flows.map(renderFlowCard).join("\n")}</main></body></html>`;
export const buildFlowReview = async (directory: string): Promise<void> => {
	const output = resolve(directory, "dist");
	await normalizeReviewAssets(resolve(output, "app"));
	await Bun.write(
		resolve(output, "auth-uwh-motion.jpg"),
		Bun.file(resolve(import.meta.dir, "../public/auth-uwh-motion.jpg")),
	);
	const styles = await Bun.file(
		resolve(import.meta.dir, "../review/site.css"),
	).text();
	await Bun.write(resolve(output, "index.html"), renderFlowReview());
	await Bun.write(resolve(output, "review.css"), styles);
	await Bun.write(
		resolve(output, "flows.json"),
		`${JSON.stringify(
			productFlows.map((flow) => ({
				...flow,
				href: previewHref(flow.screen, flow.id),
			})),
			undefined,
			2,
		)}\n`,
	);
	const build = await Bun.build({
		entrypoints: [resolve(import.meta.dir, "../review/site-client.ts")],
		outdir: output,
		naming: "review.js",
		target: "browser",
		minify: true,
	});
	if (!build.success) throw new Error(build.logs.map(String).join("\n"));
	console.log(`${productFlows.length} product flows built at ${output}`);
};
if (import.meta.main) {
	const directory = process.argv.at(2);
	if (!directory)
		throw new Error("Provide the review site's output directory.");
	await buildFlowReview(directory);
}
