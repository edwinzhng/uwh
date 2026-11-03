import type { GalleryScreen } from "./screen-gallery";

const main = document.querySelector("main");
const search = document.querySelector<HTMLInputElement>('input[type="search"]');
const scenario = document.querySelector<HTMLSelectElement>(
	'select[aria-label="Scenario"]',
);
const account = document.querySelector<HTMLSelectElement>(
	'select[aria-label="Account"]',
);
const viewport = document.querySelector<HTMLSelectElement>(
	'select[aria-label="Viewport"]',
);
const count = document.querySelector("#count");
if (!main || !search || !scenario || !account || !viewport || !count)
	throw new Error("Gallery controls unavailable");
const parsed: unknown = JSON.parse(
	document.querySelector("#screens")?.textContent ?? "[]",
);
const isScreen = (value: unknown): value is GalleryScreen =>
	typeof value === "object" &&
	value !== null &&
	"id" in value &&
	typeof value.id === "string" &&
	"title" in value &&
	typeof value.title === "string" &&
	"href" in value &&
	typeof value.href === "string";
const screens = Array.isArray(parsed) ? parsed.filter(isScreen) : [];
const state: {
	observer?: IntersectionObserver;
	frame?: number;
	pinned?: HTMLElement;
	visible: Set<HTMLElement>;
} = { visible: new Set() };
const href = (screen: string): string => {
	const url = new URL(screen, location.origin);
	url.searchParams.set("reviewAccount", account.value);
	url.searchParams.set("reviewScenario", scenario.value);
	return `${url.pathname}${url.search}`;
};
const unmount = (card: HTMLElement): void => {
	for (const frame of Array.from(card.querySelectorAll("iframe")))
		frame.remove();
	card.removeAttribute("data-mounted");
};
const mount = (card: HTMLElement): void => {
	if (card.hasAttribute("data-mounted")) return;
	card.setAttribute("data-mounted", "");
	for (const host of Array.from(
		card.querySelectorAll<HTMLElement>(".frame-host"),
	)) {
		const frame = document.createElement("iframe");
		frame.title = `${card.dataset.title} · ${host.dataset.viewport}`;
		frame.src = href(card.dataset.href ?? "/");
		frame.tabIndex = card.dataset.interact === "true" ? 0 : -1;
		host.append(frame);
		if (host.dataset.viewport === "desktop")
			frame.style.transform = `scale(${host.clientWidth / 1280})`;
	}
};
const reconcile = (): void => {
	state.frame = undefined;
	const limit = innerWidth < 760 ? 1 : 2;
	const nearest = [...state.visible]
		.sort(
			(a, b) =>
				Math.abs(a.getBoundingClientRect().top - 80) -
				Math.abs(b.getBoundingClientRect().top - 80),
		)
		.slice(0, limit);
	const active = state.pinned ? [state.pinned] : nearest;
	for (const card of Array.from(
		main.querySelectorAll<HTMLElement>("article"),
	)) {
		if (active.includes(card)) mount(card);
		else unmount(card);
	}
};
const schedule = (): void => {
	if (state.frame === undefined) state.frame = requestAnimationFrame(reconcile);
};
const render = (): void => {
	state.observer?.disconnect();
	state.visible.clear();
	state.pinned = undefined;
	const selected = screens.filter((screen) =>
		`${screen.title} ${screen.href}`
			.toLowerCase()
			.includes(search.value.toLowerCase()),
	);
	count.textContent = `${selected.length} screens`;
	main.replaceChildren();
	for (const screen of selected) {
		const card = document.createElement("article");
		card.dataset.href = screen.href;
		card.dataset.title = screen.title;
		card.dataset.interact = "false";
		const heading = document.createElement("div");
		heading.className = "card-heading";
		const title = document.createElement("h2");
		title.textContent = screen.title;
		const open = document.createElement("a");
		open.textContent = "Open";
		open.href = href(screen.href);
		open.target = "_blank";
		open.rel = "noopener";
		const label = document.createElement("label");
		const interact = document.createElement("input");
		interact.type = "checkbox";
		interact.addEventListener("change", (): void => {
			for (const other of Array.from(
				main.querySelectorAll<HTMLElement>('article[data-interact="true"]'),
			)) {
				other.dataset.interact = "false";
				const toggle = other.querySelector<HTMLInputElement>(
					'input[type="checkbox"]',
				);
				if (toggle && toggle !== interact) toggle.checked = false;
			}
			card.dataset.interact = String(interact.checked);
			state.pinned = interact.checked ? card : undefined;
			for (const frame of Array.from(card.querySelectorAll("iframe")))
				frame.tabIndex = interact.checked ? 0 : -1;
			schedule();
		});
		label.append(interact, "Interact");
		heading.append(title, label, open);
		card.append(heading);
		const pair = document.createElement("div");
		pair.className = "screens";
		const sizes =
			viewport.value === "both" ? ["phone", "desktop"] : [viewport.value];
		for (const size of sizes) {
			const host = document.createElement("div");
			host.className = "frame-host";
			host.dataset.viewport = size;
			pair.append(host);
		}
		card.append(pair);
		main.append(card);
	}
	state.observer = new IntersectionObserver(
		(entries): void => {
			for (const entry of entries) {
				if (!(entry.target instanceof HTMLElement)) continue;
				if (entry.isIntersecting) state.visible.add(entry.target);
				else state.visible.delete(entry.target);
			}
			schedule();
		},
		{ rootMargin: "100px" },
	);
	for (const card of Array.from(main.querySelectorAll("article")))
		state.observer.observe(card);
};
search.addEventListener("input", render);
for (const select of [scenario, account, viewport])
	select.addEventListener("change", render);
document.querySelector("#refresh")?.addEventListener("click", (): void => {
	for (const card of Array.from(
		main.querySelectorAll<HTMLElement>("article[data-mounted]"),
	)) {
		unmount(card);
		mount(card);
	}
});
addEventListener("scroll", schedule, { passive: true });
addEventListener(
	"resize",
	(): void => {
		for (const host of Array.from(
			document.querySelectorAll<HTMLElement>(
				'.frame-host[data-viewport="desktop"]',
			),
		)) {
			const frame = host.querySelector("iframe");
			if (frame) frame.style.transform = `scale(${host.clientWidth / 1280})`;
		}
		schedule();
	},
	{ passive: true },
);
render();
