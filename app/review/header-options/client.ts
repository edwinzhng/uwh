type Option = { id: string; name: string; description: string };
const options: Option[] = [
	{
		id: "compact",
		name: "01 / Compact title row",
		description:
			"Back, title and action share one row. Smaller title, less vertical padding.",
	},
	{
		id: "integrated",
		name: "02 / Unified top bar",
		description:
			"Back, title and account tools share the top bar. New sits beside the filters.",
	},
	{
		id: "content",
		name: "03 / Large title, tighter",
		description:
			"Keep the performance heading. Move Back into the utility bar and tighten the gaps.",
	},
];
const root = document.querySelector<HTMLElement>("#options");
const selector = document.querySelector<HTMLSelectElement>("#page");
if (!root || !selector) throw new Error("Missing header preview controls");
const selection = { size: "phone", page: "resources" };
const source = (id: string): string =>
	`http://127.0.0.1:4298/${selection.page}?reviewAccount=casey&reviewPerson=casey&headerOption=${id}`;
root.innerHTML = options
	.map(
		(option) =>
			`<section><h2>${option.name}</h2><p>${option.description}</p><div class="actions"><button type="button" class="interact" aria-pressed="false">Interact</button><a class="open" href="${source(option.id)}" target="_blank" rel="noopener">Open full size ↗</a></div><div class="frame"><iframe title="${option.name}" src="${source(option.id)}" loading="lazy" tabindex="-1"></iframe></div></section>`,
	)
	.join("");
const resize = (): void => {
	document.querySelectorAll<HTMLElement>(".frame").forEach((frame) => {
		const iframe = frame.querySelector("iframe");
		if (!iframe) return;
		const width = selection.size === "phone" ? 390 : 1100;
		const height = selection.size === "phone" ? 844 : 800;
		const scale = frame.clientWidth / width;
		frame.style.height = `${height * scale}px`;
		iframe.style.width = `${width}px`;
		iframe.style.height = `${height}px`;
		iframe.style.transform = `scale(${scale})`;
	});
};
new ResizeObserver(resize).observe(root);
selector.addEventListener("change", (): void => {
	selection.page = selector.value;
	document.querySelectorAll("section").forEach((section, index): void => {
		const option = options.at(index);
		const iframe = section.querySelector("iframe");
		const link = section.querySelector<HTMLAnchorElement>(".open");
		if (option && iframe && link) {
			iframe.src = source(option.id);
			link.href = source(option.id);
		}
	});
});
document
	.querySelectorAll<HTMLButtonElement>("[data-size]")
	.forEach((button): void => {
		button.addEventListener("click", (): void => {
			selection.size = button.dataset.size ?? "phone";
			document
				.querySelectorAll<HTMLButtonElement>("[data-size]")
				.forEach((entry) => {
					entry.setAttribute("aria-pressed", String(entry === button));
				});
			resize();
		});
	});
document
	.querySelectorAll<HTMLButtonElement>(".interact")
	.forEach((button): void => {
		button.addEventListener("click", (): void => {
			const section = button.closest("section");
			const frame = section?.querySelector(".frame");
			const iframe = section?.querySelector("iframe");
			if (!frame || !iframe) return;
			const active = frame.classList.toggle("interacting");
			button.setAttribute("aria-pressed", String(active));
			button.textContent = active ? "Interacting ✓" : "Interact";
			iframe.tabIndex = active ? 0 : -1;
			iframe.inert = !active;
		});
	});
document.querySelectorAll("iframe").forEach((iframe) => {
	iframe.inert = true;
});
resize();
