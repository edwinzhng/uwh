import {
	motionDurations,
	motionEasingCss,
	motionEffects,
} from "../../../packages/design-system/src/motion";

type Style = { id: string; name: string; description: string };
type CardKind = "announcement" | "feedback" | "fitness";
const styles: Style[] = [
	{
		id: "editorial",
		name: "01 / Club journal",
		description:
			"Warm paper, compact section headers, editorial type. Quiet and distinctive.",
	},
	{
		id: "stripe",
		name: "02 / Sport stripe",
		description:
			"A full-width header rule and diagonal hatching clipped precisely into the corner.",
	},
	{
		id: "glass",
		name: "03 / Frosted depth",
		description:
			"Soft highlights and rounded icon tiles. Glass-inspired depth with a readable, opaque core.",
	},
	{
		id: "pool",
		name: "04 / Pool light",
		description:
			"Real WebGL caustics behind the content. A restrained nod to underwater hockey.",
	},
	{
		id: "metal",
		name: "05 / Brushed equipment",
		description:
			"Fine directional grain and a light-catching edge. Technical, calm, tactile.",
	},
	{
		id: "mesh",
		name: "06 / Color atmosphere",
		description:
			"Compact performance cards. Neutral icons, lime result accents, and a quieter spotlight.",
	},
];
const icons: Record<CardKind, string> = {
	announcement:
		'<path d="m3 10 14-6v16L3 14zM6 15l2 6h3l-2-5M20 8l2-1m-2 5h3m-3 4 2 1"/>',
	feedback:
		'<path d="M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z"/>',
	fitness: '<path d="M4 3v17h17M9 15V9m5 6V5m5 10v-5"/>',
};
const titles: Record<CardKind, string> = {
	announcement: "Announcement",
	feedback: "Feedback",
	fitness: "Fitness tests",
};
const svg = (body: string, className = "icon"): string =>
	`<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const card = (kind: CardKind, shader: boolean, spotlight: boolean): string =>
	`<article class="card ${kind}">${shader ? '<canvas class="shader" aria-hidden="true"></canvas>' : ""}${spotlight ? '<div class="spotlight" aria-hidden="true"></div>' : ""}<div class="card-content"><header class="card-header">${svg(icons[kind])}<h3>${titles[kind]}</h3><button type="button" class="open" data-open="${kind}" aria-label="Open ${titles[kind].toLowerCase()}">${svg('<path d="m9 5 7 7-7 7"/>', "chevron")}</button></header>${kind === "announcement" ? '<p class="body-copy">Thursday registration closes soon. Complete payment and your waiver before practice.</p><p class="meta">Nov 3, 2026</p>' : kind === "feedback" ? '<p class="body-copy">Keep moving after a pass and offer a clear passing option.</p><p class="meta">Nathaniel Schoenberger · Oct 29, 2026</p>' : '<div class="metric-row"><span class="metric">1:22</span><span class="delta">↓ 0:03</span></div><p class="metric-name">50 m swim</p><p class="meta">Rylan Smith · Oct 25, 2026</p>'}</div>${kind === "announcement" ? '<footer class="footer"><button type="button" data-open="announcement">Read announcement</button><button type="button" class="quiet" data-dismiss>Dismiss</button></footer>' : ""}</article>`;
const cards = (shader: boolean, spotlight: boolean): string =>
	(["announcement", "feedback", "fitness"] satisfies CardKind[])
		.map((kind) => card(kind, shader, spotlight))
		.join("");
const pane = (style: string, baseline: boolean): string =>
	`<div class="${baseline ? "baseline" : style}"><div class="label"><span><span class="viewport-label">Compact</span></span><button type="button" class="interact" aria-pressed="false">Interact</button></div><div class="stage"><div class="stack inert-preview" inert>${cards(style === "pool" && !baseline, style === "mesh" && !baseline)}</div></div></div>`;
const gallery = document.querySelector<HTMLElement>("#gallery");
const index = document.querySelector<HTMLElement>("#index");
if (!gallery || !index) throw new Error("Missing gallery");
index.innerHTML = styles
	.map((style) => `<a href="#${style.id}">${style.name}</a>`)
	.join("");
gallery.innerHTML = styles
	.map(
		(style) =>
			`<section class="study" id="${style.id}" aria-labelledby="heading-${style.id}"><div class="study-heading"><div><h2 id="heading-${style.id}">${style.name}</h2><p>${style.description}</p></div><button type="button" class="pick" aria-pressed="false" data-pick="${style.id}">Shortlist</button></div><div class="comparison">${pane(style.id, false)}</div></section>`,
	)
	.join("");
const detail = document.querySelector<HTMLDialogElement>("#detail");
const detailContent = document.querySelector<HTMLElement>("#detail-content");
const toast = document.querySelector<HTMLElement>(".toast");
const notify = (message: string): void => {
	if (!toast) return;
	toast.textContent = message;
	toast.classList.add("visible");
	window.setTimeout(() => toast.classList.remove("visible"), 2400);
};
const readShortlist = (): string[] => {
	try {
		const stored: unknown = JSON.parse(
			localStorage.getItem("crocs-card-shortlist") ?? "[]",
		);
		return Array.isArray(stored)
			? stored.filter(
					(item: unknown): item is string =>
						typeof item === "string" &&
						styles.some((style) => style.id === item),
				)
			: [];
	} catch {
		return [];
	}
};
const shortlist = new Set<string>(readShortlist());
const saveShortlist = (): void => {
	try {
		localStorage.setItem(
			"crocs-card-shortlist",
			JSON.stringify([...shortlist]),
		);
	} catch {
		notify("Shortlist kept for this session.");
	}
};
const syncShortlist = (): void => {
	document
		.querySelectorAll<HTMLButtonElement>("[data-pick]")
		.forEach((button) => {
			const selected = shortlist.has(button.dataset.pick ?? "");
			button.setAttribute("aria-pressed", String(selected));
			button.textContent = selected ? "Shortlisted ✓" : "Shortlist";
		});
};
syncShortlist();
document.addEventListener("click", (event: MouseEvent): void => {
	if (!(event.target instanceof Element)) return;
	const button = event.target.closest<HTMLButtonElement>("button");
	if (!button) return;
	if (button.dataset.viewport) {
		const desktop = button.dataset.viewport === "desktop";
		document.body.classList.toggle("desktop", desktop);
		document
			.querySelectorAll<HTMLButtonElement>("[data-viewport]")
			.forEach((entry): void => {
				entry.setAttribute("aria-pressed", String(entry === button));
			});
		document.querySelectorAll(".viewport-label").forEach((entry) => {
			entry.textContent = desktop ? "Wide" : "Compact";
		});
	}
	if (button.id === "theme") {
		const light = document.body.classList.toggle("light");
		button.setAttribute("aria-pressed", String(light));
		button.textContent = light ? "Dark mode" : "Light mode";
	}
	if (button.classList.contains("interact")) {
		const stack = button
			.closest(".label")
			?.parentElement?.querySelector<HTMLElement>(".stack");
		if (stack) {
			const active = stack.inert;
			stack.inert = !active;
			stack.classList.toggle("inert-preview", !active);
			button.setAttribute("aria-pressed", String(active));
			button.textContent = active ? "Interacting ✓" : "Interact";
		}
	}
	if (button.dataset.pick) {
		const id = button.dataset.pick;
		shortlist.has(id) ? shortlist.delete(id) : shortlist.add(id);
		saveShortlist();
		syncShortlist();
		notify(
			shortlist.has(id) ? "Added to your shortlist" : "Removed from shortlist",
		);
	}
	if (button.hasAttribute("data-dismiss")) {
		const article = button.closest<HTMLElement>(".card");
		if (article) {
			article.hidden = true;
			article.nextElementSibling
				?.querySelector<HTMLButtonElement>("button")
				?.focus();
			notify("Preview announcement dismissed. Reload to restore.");
		}
	}
	if (button.dataset.open && detail && detailContent) {
		const kind = button.dataset.open;
		detailContent.innerHTML =
			kind === "fitness"
				? '<h2 id="detail-title" class="detail-title">50 m swim</h2><p class="detail-copy">1:22 · 3 seconds faster</p><p class="detail-meta">Rylan Smith · Oct 25, 2026</p>'
				: kind === "feedback"
					? '<h2 id="detail-title" class="detail-title">Feedback</h2><p class="detail-copy">Keep moving after a pass and offer a clear passing option.</p><p class="detail-meta">Nathaniel Schoenberger · Oct 29, 2026</p>'
					: '<h2 id="detail-title" class="detail-title">Thursday registration</h2><p class="detail-copy">Complete payment and your waiver before Thursday practice.</p><p class="detail-meta">Preview content · No account changes</p>';
		detail.showModal();
	}
});
const vertex =
	"attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}";
const fragment = `precision mediump float;uniform vec2 resolution;uniform float time;void main(){vec2 p=gl_FragCoord.xy/resolution*5.;float a=sin(p.x*2.1+sin(p.y*1.8+time*.4)+time*.3);float b=sin(p.y*2.8+cos(p.x*1.6-time*.3)-time*.25);float c=pow(max(0.,1.-abs(a+b)*.8),6.);vec3 color=mix(vec3(.04,.16,.13),vec3(.5,.86,.7),c);gl_FragColor=vec4(color,1.);}`;
type Shader = {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	program: WebGLProgram;
	visible: boolean;
};
const shaders: Shader[] = [];
const compile = (
	gl: WebGLRenderingContext,
	type: number,
	source: string,
): WebGLShader | undefined => {
	const shader = gl.createShader(type);
	if (!shader) return;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return;
	}
	return shader;
};
const render = (shader: Shader, time: number): void => {
	const { canvas, gl, program } = shader;
	const rect = canvas.getBoundingClientRect();
	const width = Math.max(1, Math.round(rect.width));
	const height = Math.max(1, Math.round(rect.height));
	if (canvas.width !== width || canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
	}
	gl.viewport(0, 0, width, height);
	Reflect.apply(gl.useProgram, gl, [program]);
	gl.uniform2f(gl.getUniformLocation(program, "resolution"), width, height);
	gl.uniform1f(gl.getUniformLocation(program, "time"), time);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};
const prepare = (canvas: HTMLCanvasElement): Shader | undefined => {
	const gl = canvas.getContext("webgl", {
		alpha: false,
		antialias: false,
		powerPreference: "low-power",
	});
	if (!gl) {
		canvas.hidden = true;
		return;
	}
	const vs = compile(gl, gl.VERTEX_SHADER, vertex);
	const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
	const program = gl.createProgram();
	if (!vs || !fs || !program) {
		canvas.hidden = true;
		return;
	}
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		canvas.hidden = true;
		return;
	}
	Reflect.apply(gl.useProgram, gl, [program]);
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
		gl.STATIC_DRAW,
	);
	const position = gl.getAttribLocation(program, "position");
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
	return { canvas, gl, program, visible: true };
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const motion = document.querySelector<HTMLButtonElement>("#motion");
const animation = { enabled: false, frame: 0 };
const tick = (timestamp: number): void => {
	if (!animation.enabled || reduced.matches || document.hidden) {
		animation.frame = 0;
		return;
	}
	shaders
		.filter((shader) => shader.visible)
		.forEach((shader): void => {
			render(shader, (timestamp / motionEffects.cardMaterialFlow) * 6);
		});
	animation.frame = requestAnimationFrame(tick);
};
const stop = (): void => {
	cancelAnimationFrame(animation.frame);
	animation.frame = 0;
};
const restart = (): void => {
	stop();
	if (
		animation.enabled &&
		!reduced.matches &&
		!document.hidden &&
		shaders.some((shader) => shader.visible)
	)
		animation.frame = requestAnimationFrame(tick);
};
const observer = new IntersectionObserver(
	(entries) => {
		entries.forEach((entry) => {
			if (!(entry.target instanceof HTMLCanvasElement)) return;
			const existing = shaders.find((shader) => shader.canvas === entry.target);
			if (existing) {
				existing.visible = entry.isIntersecting;
				if (existing.visible) render(existing, 2);
			} else if (entry.isIntersecting) {
				const shader = prepare(entry.target);
				if (shader) {
					shaders.push(shader);
					render(shader, 2);
				}
			}
		});
		restart();
	},
	{ rootMargin: "100px" },
);
document
	.querySelectorAll<HTMLCanvasElement>(".shader")
	.forEach((canvas): void => {
		observer.observe(canvas);
	});
motion?.addEventListener("click", (): void => {
	animation.enabled = !animation.enabled;
	motion.setAttribute("aria-pressed", String(animation.enabled));
	motion.textContent = animation.enabled ? "Pause shaders" : "Animate shaders";
	restart();
});
const syncMotion = (): void => {
	if (motion) {
		motion.disabled = reduced.matches;
		motion.textContent = reduced.matches
			? "Reduced motion"
			: animation.enabled
				? "Pause shaders"
				: "Animate shaders";
	}
	restart();
};
reduced.addEventListener("change", syncMotion);
syncMotion();
document.addEventListener("visibilitychange", restart);
new ResizeObserver(() =>
	shaders
		.filter((shader) => shader.visible)
		.forEach((shader): void => {
			render(shader, 2);
		}),
).observe(document.body);

document.documentElement.style.setProperty(
	"--spot-duration",
	`${motionDurations.fast}ms`,
);
document.documentElement.style.setProperty(
	"--spot-ease",
	motionEasingCss("out"),
);
const spotlightState = { frame: 0, timeout: 0 };
const clearSpotlights = (): void => {
	document.querySelectorAll(".mesh .spot-active").forEach((card): void => {
		card.classList.remove("spot-active");
	});
};
const lightCard = (card: HTMLElement, x: number, y: number): void => {
	const light = card.querySelector<HTMLElement>(".spotlight");
	if (!light) return;
	const rect = card.getBoundingClientRect();
	const localX = reduced.matches ? rect.width / 2 : x - rect.left;
	const localY = reduced.matches ? rect.height / 2 : y - rect.top;
	light.style.transform = `translate(${localX - 180}px, ${localY - 180}px)`;
	card.classList.add("spot-active");
};
document
	.querySelectorAll<HTMLElement>(".mesh .stage")
	.forEach((stage): void => {
		const locate = (event: PointerEvent): HTMLElement | undefined =>
			Array.from(stage.querySelectorAll<HTMLElement>(".card")).find((card) => {
				const rect = card.getBoundingClientRect();
				return (
					!card.hidden &&
					event.clientX >= rect.left &&
					event.clientX <= rect.right &&
					event.clientY >= rect.top &&
					event.clientY <= rect.bottom
				);
			});
		stage.addEventListener("pointermove", (event: PointerEvent): void => {
			if (
				event.pointerType !== "mouse" ||
				!matchMedia("(hover: hover)").matches
			)
				return;
			cancelAnimationFrame(spotlightState.frame);
			spotlightState.frame = requestAnimationFrame((): void => {
				clearSpotlights();
				const card = locate(event);
				if (card) lightCard(card, event.clientX, event.clientY);
			});
		});
		stage.addEventListener("pointerleave", (): void => {
			cancelAnimationFrame(spotlightState.frame);
			clearSpotlights();
		});
		stage.addEventListener("pointerdown", (event: PointerEvent): void => {
			window.clearTimeout(spotlightState.timeout);
			clearSpotlights();
			const card = locate(event);
			if (card) lightCard(card, event.clientX, event.clientY);
		});
		const release = (): void => {
			spotlightState.timeout = window.setTimeout(
				clearSpotlights,
				motionDurations.extended,
			);
		};
		stage.addEventListener("pointerup", release);
		stage.addEventListener("pointercancel", clearSpotlights);
		stage.addEventListener("focusin", (event: FocusEvent): void => {
			if (!(event.target instanceof Element)) return;
			const card = event.target.closest<HTMLElement>(".card");
			if (!card) return;
			clearSpotlights();
			const rect = card.getBoundingClientRect();
			lightCard(card, rect.left + rect.width / 2, rect.top + rect.height / 2);
		});
		stage.addEventListener("focusout", clearSpotlights);
	});
