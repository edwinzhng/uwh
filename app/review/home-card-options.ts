type Treatment = "spotlight" | "wash" | "accent";
type Viewport = "phone" | "desktop";

const state: {
	treatment: Treatment;
	viewport: Viewport;
	interact: boolean;
} = { treatment: "spotlight", viewport: "phone", interact: false };

const comparison = document.querySelector("#comparison");
const measureFrames = (): void => {
	if (!(comparison instanceof HTMLElement)) return;
	const frames = Array.from(comparison.querySelectorAll("iframe"));
	const timestamps: number[] = [];
	const sample = (timestamp: number): void => {
		if (!frames.every((frame) => frame.isConnected)) return;
		timestamps.push(timestamp);
		if (timestamps.length < 91) {
			requestAnimationFrame(sample);
			return;
		}
		const intervals = timestamps
			.slice(1)
			.map((value, index) => value - (timestamps.at(index) ?? value));
		const sorted = intervals.toSorted((a, b) => a - b);
		comparison.dataset.frameAverageMs = (
			intervals.reduce((sum, value) => sum + value, 0) / intervals.length
		).toFixed(1);
		comparison.dataset.frameP95Ms = (
			sorted.at(Math.floor(sorted.length * 0.95)) ?? 0
		).toFixed(1);
		comparison.dataset.slowFrames = String(
			intervals.filter((value) => value > 34).length,
		);
	};
	requestAnimationFrame(sample);
};
const frameSize = (): { width: number; height: number } =>
	state.viewport === "phone"
		? { width: 390, height: 1600 }
		: { width: 1280, height: 1200 };

const resizeFrames = (): void => {
	const size = frameSize();
	for (const host of Array.from(
		document.querySelectorAll<HTMLElement>(".frame-host"),
	)) {
		const frame = host.querySelector("iframe");
		if (!frame) continue;
		const scale = host.clientWidth / size.width;
		host.style.height = `${size.height * scale}px`;
		frame.style.width = `${size.width}px`;
		frame.style.height = `${size.height}px`;
		frame.style.transform = `scale(${scale})`;
	}
};

const syncInteractions = (): void => {
	for (const frame of Array.from(document.querySelectorAll("iframe"))) {
		frame.inert = !state.interact;
		frame.style.pointerEvents = state.interact ? "auto" : "none";
	}
};

const renderFrames = (): void => {
	if (!comparison) return;
	comparison.replaceChildren();
	const loaded = new Set<string>();
	comparison.setAttribute("data-viewport", state.viewport);
	for (const side of ["Before", "After"]) {
		const article = document.createElement("article");
		const heading = document.createElement("h2");
		heading.textContent = `${state.viewport === "phone" ? "Phone" : "Desktop"} · ${side}`;
		const host = document.createElement("div");
		host.className = "frame-host";
		const frame = document.createElement("iframe");
		frame.title = `${heading.textContent} home cards`;
		frame.addEventListener("load", (): void => {
			loaded.add(side);
			if (loaded.size === 2) measureFrames();
		});
		frame.src = `/?reviewScenario=home-cards&reviewCards=${side === "Before" ? "current" : state.treatment}`;
		host.append(frame);
		article.append(heading, host);
		comparison.append(article);
	}
	resizeFrames();
	syncInteractions();
};

for (const button of Array.from(
	document.querySelectorAll<HTMLButtonElement>("[data-treatment]"),
)) {
	button.addEventListener("click", (): void => {
		const treatment = button.dataset.treatment;
		if (
			treatment !== "spotlight" &&
			treatment !== "wash" &&
			treatment !== "accent"
		)
			return;
		state.treatment = treatment;
		for (const item of Array.from(
			document.querySelectorAll("[data-treatment]"),
		))
			item.setAttribute("aria-pressed", String(item === button));
		renderFrames();
	});
}

for (const button of Array.from(
	document.querySelectorAll<HTMLButtonElement>("[data-viewport]"),
)) {
	button.addEventListener("click", (): void => {
		const viewport = button.dataset.viewport;
		if (viewport !== "phone" && viewport !== "desktop") return;
		state.viewport = viewport;
		for (const item of Array.from(
			document.querySelectorAll("button[data-viewport]"),
		))
			item.setAttribute("aria-pressed", String(item === button));
		renderFrames();
	});
}

document
	.querySelector<HTMLInputElement>("#interact")
	?.addEventListener("change", (event): void => {
		if (!(event.target instanceof HTMLInputElement)) return;
		state.interact = event.target.checked;
		syncInteractions();
	});
document.querySelector("#reset")?.addEventListener("click", renderFrames);
new ResizeObserver(resizeFrames).observe(document.body);
renderFrames();
