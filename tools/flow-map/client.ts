const state: { frame?: HTMLIFrameElement; button?: HTMLButtonElement } = {};
const stop = (): void => {
	state.frame?.remove();
	if (state.button) state.button.textContent = "Interact";
	state.frame = undefined;
	state.button = undefined;
};
const viewport = (): string =>
	document.querySelector<HTMLSelectElement>("#viewport")?.value ?? "phone";
const scale = (): void => {
	const frame = state.frame;
	if (!frame) return;
	const width = viewport() === "phone" ? 390 : 1280;
	frame.style.width = `${width}px`;
	frame.style.height = viewport() === "phone" ? "844px" : "900px";
	frame.style.transform = `scale(${(frame.parentElement?.clientWidth ?? width) / width})`;
};
document.addEventListener("click", (event): void => {
	if (!(event.target instanceof Element)) return;
	const filter = event.target.closest<HTMLButtonElement>(
		"button[data-persona]",
	);
	if (filter) {
		stop();
		for (const button of document.querySelectorAll<HTMLButtonElement>(
			"button[data-persona]",
		))
			button.setAttribute("aria-pressed", String(button === filter));
		for (const group of document.querySelectorAll<HTMLElement>(".persona"))
			group.hidden =
				filter.dataset.persona !== "all" &&
				filter.dataset.persona !== group.dataset.persona;
		for (const section of document.querySelectorAll<HTMLElement>("section"))
			section.hidden = !section.querySelector(".persona:not([hidden])");
		for (const link of document.querySelectorAll<HTMLAnchorElement>("nav a"))
			link.hidden =
				document.getElementById(link.hash.slice(1))?.hidden ?? false;
	}
	const live = event.target.closest<HTMLButtonElement>("button[data-live]");
	const figure = live?.closest<HTMLElement>("figure");
	if (!live || !figure) return;
	const wasActive = state.button === live;
	stop();
	if (wasActive) return;
	const frame = document.createElement("iframe");
	frame.title =
		figure.querySelector("figcaption")?.textContent ?? "App preview";
	frame.setAttribute(
		"sandbox",
		"allow-scripts allow-same-origin allow-forms allow-popups allow-downloads",
	);
	frame.src = figure.dataset.route ?? "";
	figure.querySelector(".frame")?.append(frame);
	state.frame = frame;
	state.button = live;
	live.textContent = "Stop interacting";
	scale();
});
document.addEventListener(
	"toggle",
	(event): void => {
		if (
			event.target instanceof HTMLDetailsElement &&
			!event.target.open &&
			event.target.contains(state.frame ?? document.createElement("div"))
		)
			stop();
	},
	true,
);
document.querySelector("#viewport")?.addEventListener("change", (): void => {
	stop();
	document.body.dataset.viewport = viewport();
	for (const image of document.querySelectorAll<HTMLImageElement>(
		"figure img",
	)) {
		const id = image.closest<HTMLElement>("figure")?.dataset.screen;
		image.src = `/screens/${id}-${viewport()}.jpg`;
		image.width = viewport() === "phone" ? 390 : 1280;
		image.height = viewport() === "phone" ? 844 : 900;
	}
});
window.addEventListener("resize", scale);
window.addEventListener(
	"scroll",
	(): void => {
		const bounds = state.frame?.parentElement?.getBoundingClientRect();
		if (bounds && (bounds.bottom < 0 || bounds.top > innerHeight)) stop();
	},
	{ passive: true },
);
window.addEventListener("pagehide", stop);
