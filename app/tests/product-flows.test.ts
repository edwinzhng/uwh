import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { productFlows } from "../review/product-flows";
import {
	buildFlowReview,
	flowSteps,
	renderFlowCard,
	renderFlowReview,
} from "../scripts/build-flow-review";

const elementsIn = async (
	html: string,
	selector: string,
	attributes: readonly string[] = [],
): Promise<
	{ tag: string; attributes: Record<string, string | undefined> }[]
> => {
	const elements: {
		tag: string;
		attributes: Record<string, string | undefined>;
	}[] = [];
	await new HTMLRewriter()
		.on(selector, {
			element: (element): void => {
				elements.push({
					tag: element.tagName,
					attributes: Object.fromEntries(
						attributes.map((attribute) => [
							attribute,
							element.getAttribute(attribute) ?? undefined,
						]),
					),
				});
			},
		})
		.transform(new Response(html))
		.text();
	return elements;
};

test("public flow cards have unique anchors, concise copy and real local routes", () => {
	expect(new Set(productFlows.map((flow) => flow.id)).size).toBe(
		productFlows.length,
	);
	for (const flow of productFlows) {
		expect(flow.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
		expect(flow.status).not.toBe("remaining");
		expect(flow.name.trim()).not.toBe("");
		expect(flow.description).not.toContain("\n");
		expect(flow.entry).not.toContain("\n");
		const url = new URL(flow.screen, "https://review.invalid");
		expect(url.origin).toBe("https://review.invalid");
		const filename = `${url.pathname === "/" ? "index" : url.pathname.slice(1)}.tsx`;
		expect(
			["../app", "../app/(tabs)"].some((directory) =>
				existsSync(resolve(import.meta.dir, directory, filename)),
			),
		).toBe(true);
	}
});

test("entry chains stay ordered, keep choice labels together and use canonical routes", (): void => {
	expect(flowSteps(" Account → Progress → Check in ")).toEqual([
		"Account",
		"Progress",
		"Check in",
	]);
	expect(flowSteps("Session → Training / Hockey")).toEqual([
		"Session",
		"Training / Hockey",
	]);
	expect(productFlows.find((flow) => flow.id === "goals")?.entry).toBe(
		"Member → Goals & reflections",
	);
	expect(productFlows.find((flow) => flow.id === "invites")?.entry).toBe(
		"Members → Invites",
	);
	for (const flow of productFlows) {
		expect(flowSteps(flow.entry).length).toBeGreaterThan(0);
		expect(flowSteps(flow.entry).length).toBeLessThanOrEqual(4);
	}
});

test("initial gallery is text-only with native collapsed disclosures and no preview controls", async (): Promise<void> => {
	const html = renderFlowReview();
	const initial = await new HTMLRewriter()
		.on("template", {
			element: (element): void => {
				element.remove();
			},
		})
		.transform(new Response(html))
		.text();
	expect(await elementsIn(initial, "article[data-flow]")).toHaveLength(
		productFlows.length,
	);
	expect(await elementsIn(initial, "ol.flow-steps[role=list]")).toHaveLength(
		productFlows.length,
	);
	expect(await elementsIn(initial, "li.flow-step")).toHaveLength(
		productFlows.reduce(
			(total, flow) => total + flowSteps(flow.entry).length,
			0,
		),
	);
	expect(
		await elementsIn(initial, "details[data-preview]:not([open])"),
	).toHaveLength(productFlows.length);
	expect(await elementsIn(initial, "details summary[aria-label]")).toHaveLength(
		productFlows.length,
	);
	expect(
		await elementsIn(
			initial,
			"img, iframe, button, input, .screen, .preview-panel",
		),
	).toHaveLength(0);
	expect(await elementsIn(initial, "h1, h2, h3, h4, nav")).toHaveLength(0);
	expect(
		await elementsIn(
			html,
			"img[src], img[srcset], iframe, link[rel=preload], link[rel=prefetch]",
		),
	).toHaveLength(0);
	expect(
		(await elementsIn(html, "script[src]", ["src"])).map(
			(element) => element.attributes.src,
		),
	).toEqual(["/review.js"]);
});

test("preview templates preserve real routes, deterministic screenshot sizes and accessible local controls", async (): Promise<void> => {
	const html = renderFlowReview();
	expect(await elementsIn(html, "template")).toHaveLength(productFlows.length);
	const images = await elementsIn(html, "img", [
		"src",
		"data-src-phone",
		"data-src-desktop",
		"width",
		"height",
		"alt",
	]);
	expect(images).toHaveLength(productFlows.length);
	for (const [index, flow] of productFlows.entries()) {
		const image = images.at(index);
		expect(image?.attributes.src).toBeUndefined();
		expect(image?.attributes["data-src-phone"]).toBe(
			`/screenshots/${flow.id}-phone.jpg`,
		);
		expect(image?.attributes["data-src-desktop"]).toBe(
			`/screenshots/${flow.id}-desktop.jpg`,
		);
		expect(image?.attributes.width).toBe("390");
		expect(image?.attributes.height).toBe("844");
		expect(image?.attributes.alt).toContain("fictional sample data");
	}
	expect(
		await elementsIn(
			html,
			'button[data-viewport="phone"][aria-pressed="true"]',
		),
	).toHaveLength(productFlows.length);
	expect(
		await elementsIn(
			html,
			'button[data-viewport="desktop"][aria-pressed="false"]',
		),
	).toHaveLength(productFlows.length);
	expect(
		await elementsIn(
			html,
			'input[type="checkbox"][data-interact][aria-label]:not([checked])',
		),
	).toHaveLength(productFlows.length);
	for (const card of await elementsIn(html, "article[data-href]", [
		"data-flow",
		"data-href",
	])) {
		const href = new URL(
			card.attributes["data-href"]?.replaceAll("&amp;", "&") ?? "",
			"https://review.invalid",
		);
		expect(href.pathname).toStartWith("/app");
		expect(href.searchParams.get("reviewFlow") ?? undefined).toBe(
			card.attributes["data-flow"],
		);
	}
});

test("flow copy is escaped without creating executable markup", (): void => {
	const flow = productFlows.at(0);
	if (!flow) throw new Error("Flow fixture unavailable.");
	const html = renderFlowCard({
		...flow,
		name: '<script>"name" & screen</script>',
		entry: 'Open <menu> → Choose "screen"',
		description: "A <b>real</b> screen & safe copy.",
	});
	expect(html).not.toContain("<script>");
	expect(html).not.toContain("<b>");
	expect(html).toContain(
		"&lt;script&gt;&quot;name&quot; &amp; screen&lt;/script&gt;",
	);
	expect(html).toContain("Open &lt;menu&gt;");
});

test("step chains stay horizontal with overflow confined to the bounded strip", async (): Promise<void> => {
	const css = await Bun.file(
		resolve(import.meta.dir, "../review/site.css"),
	).text();
	const strip = css.match(/\.flow-steps\s*\{([^}]+)\}/u)?.at(1);
	const step = css.match(/\.flow-step\s*\{([^}]+)\}/u)?.at(1);
	const card = css.match(/\.step-card\s*\{([^}]+)\}/u)?.at(1);
	expect(strip).toContain("flex-wrap: nowrap");
	expect(strip).toContain("min-width: 0");
	expect(strip).toContain("max-width: 100%");
	expect(strip).toContain("overflow-x: auto");
	expect(step).toContain("flex: 0 0 auto");
	expect(card).toContain("max-width: 28ch");
	expect(card).toContain("overflow-wrap: break-word");
	expect(await elementsIn(renderFlowReview(), "ol[tabindex]")).toHaveLength(0);
});

test("gallery generator builds a small standalone shell before an app export exists", async (): Promise<void> => {
	const directory = await mkdtemp(join(tmpdir(), "uwh-flow-gallery-"));
	try {
		await buildFlowReview(directory);
		const output = resolve(directory, "dist");
		const html = await Bun.file(resolve(output, "index.html")).text();
		expect(html).toBe(renderFlowReview());
		expect(Bun.file(resolve(output, "review.js")).size).toBeLessThan(20_000);
		expect(await Bun.file(resolve(output, "review.css")).text()).not.toContain(
			"content-visibility",
		);
		expect(await Bun.file(resolve(output, "app/index.html")).exists()).toBe(
			false,
		);
		expect(await elementsIn(html, "img[src], iframe")).toHaveLength(0);
		const flows: { id: string; href: string }[] = await Bun.file(
			resolve(output, "flows.json"),
		).json();
		expect(flows.map((flow) => flow.id)).toEqual(
			productFlows.map((flow) => flow.id),
		);
		expect(flows.every((flow) => flow.href.startsWith("/app/"))).toBe(true);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
