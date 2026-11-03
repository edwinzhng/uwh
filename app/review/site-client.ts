type Viewport = "phone" | "desktop";
type LivePreview = {
	details: HTMLDetailsElement;
	panel: HTMLElement;
	screen: HTMLElement;
	toggle: HTMLInputElement;
	frame: HTMLIFrameElement;
	observer: ResizeObserver;
};
const state: { active?: LivePreview; pending?: number } = {};
const listeners = new AbortController();
const viewportFor = (panel: HTMLElement): Viewport =>
	panel.dataset.viewport === "desktop" ? "desktop" : "phone";
const stopLive = (): void => {
	if (state.pending !== undefined) cancelAnimationFrame(state.pending);
	state.pending = undefined;
	const active = state.active;
	state.active = undefined;
	if (!active) return;
	active.observer.disconnect();
	if (document.activeElement === active.frame)
		active.details.querySelector("summary")?.focus({ preventScroll: true });
	active.frame.remove();
	active.toggle.checked = false;
	active.panel.dataset.interacting = "false";
};
const updateScale = (): void => {
	const active = state.active;
	if (!active) return;
	active.screen.style.setProperty(
		"--frame-scale",
		String(
			active.screen.clientWidth /
				(viewportFor(active.panel) === "phone" ? 390 : 1280),
		),
	);
};
const applyViewport = (
	details: HTMLDetailsElement,
	viewport: Viewport,
): void => {
	const panel = details.querySelector<HTMLElement>(".preview-panel");
	const image = panel?.querySelector<HTMLImageElement>("img");
	if (!details.open || !panel || !image) return;
	details.dataset.viewport = viewport;
	panel.dataset.viewport = viewport;
	for (const button of Array.from(
		panel.querySelectorAll("button[data-viewport]"),
	))
		button.setAttribute(
			"aria-pressed",
			String(button.getAttribute("data-viewport") === viewport),
		);
	image.width = viewport === "phone" ? 390 : 1280;
	image.height = viewport === "phone" ? 844 : 900;
	const source =
		viewport === "phone" ? image.dataset.srcPhone : image.dataset.srcDesktop;
	if (source && image.getAttribute("src") !== source) image.src = source;
	if (state.active?.details === details) updateScale();
};
const openPreview = (details: HTMLDetailsElement): void => {
	const mount = details.querySelector<HTMLElement>(".preview-mount");
	const template = details.querySelector<HTMLTemplateElement>("template");
	if (!details.open || !mount || !template || mount.childElementCount) return;
	mount.append(template.content.cloneNode(true));
	applyViewport(details, viewportFor(details));
};
const closePreview = (details: HTMLDetailsElement): void => {
	if (state.active?.details === details) stopLive();
	details.querySelector(".preview-mount")?.replaceChildren();
};
const startLive = (details: HTMLDetailsElement): void => {
	stopLive();
	const card = details.closest<HTMLElement>("article[data-flow]");
	const panel = details.querySelector<HTMLElement>(".preview-panel");
	const screen = panel?.querySelector<HTMLElement>(".screen");
	const toggle = panel?.querySelector<HTMLInputElement>("input[data-interact]");
	if (!details.open || !card || !panel || !screen || !toggle) return;
	const source = card.dataset.href;
	if (!source) return;
	const frame = document.createElement("iframe");
	frame.title = card.dataset.name ?? "App flow";
	frame.setAttribute(
		"sandbox",
		"allow-scripts allow-same-origin allow-forms allow-downloads allow-popups",
	);
	const observer = new ResizeObserver(updateScale);
	state.active = { details, panel, screen, toggle, frame, observer };
	toggle.checked = true;
	panel.dataset.interacting = "true";
	updateScale();
	frame.src = source;
	screen.append(frame);
	observer.observe(screen);
};
const releaseOffscreen = (): void => {
	if (state.pending !== undefined || !state.active) return;
	state.pending = requestAnimationFrame((): void => {
		state.pending = undefined;
		const active = state.active;
		if (!active) return;
		const bounds = active.screen.getBoundingClientRect();
		if (
			!active.details.open ||
			bounds.bottom <= 0 ||
			bounds.top >= window.innerHeight
		)
			stopLive();
	});
};
document.addEventListener(
	"toggle",
	(event): void => {
		const details = event.target;
		if (
			!(details instanceof HTMLDetailsElement) ||
			!details.matches("details[data-preview]")
		)
			return;
		if (details.open) openPreview(details);
		else closePreview(details);
	},
	{ capture: true, signal: listeners.signal },
);
document.addEventListener(
	"click",
	(event): void => {
		const button =
			event.target instanceof Element
				? event.target.closest<HTMLButtonElement>("button[data-viewport]")
				: undefined;
		const details = button?.closest<HTMLDetailsElement>(
			"details[data-preview]",
		);
		if (details && button) applyViewport(details, viewportFor(button));
	},
	{ signal: listeners.signal },
);
document.addEventListener(
	"change",
	(event): void => {
		const toggle = event.target;
		if (
			!(toggle instanceof HTMLInputElement) ||
			!toggle.matches("[data-interact]")
		)
			return;
		const details = toggle.closest<HTMLDetailsElement>("details[data-preview]");
		if (!details) return;
		if (toggle.checked) startLive(details);
		else if (state.active?.details === details) stopLive();
	},
	{ signal: listeners.signal },
);
window.addEventListener("scroll", releaseOffscreen, {
	passive: true,
	signal: listeners.signal,
});
window.addEventListener("resize", releaseOffscreen, {
	signal: listeners.signal,
});
window.addEventListener(
	"pagehide",
	(event): void => {
		stopLive();
		if (!event.persisted) listeners.abort();
	},
	{ signal: listeners.signal },
);
