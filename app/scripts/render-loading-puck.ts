import { motionEffects } from "../../packages/design-system/src/motion";
import { createPuckRenderer } from "../src/design-system/puck-renderer";

const element = document.querySelector("canvas");
if (!(element instanceof HTMLCanvasElement))
	throw new Error("Puck export canvas missing.");
const canvas = element;
const context = canvas.getContext("webgl", {
	alpha: true,
	antialias: false,
	preserveDrawingBuffer: true,
	premultipliedAlpha: true,
});
if (!context) throw new Error("WebGL required for puck export.");
const renderer = createPuckRenderer(context);
const state = { dark: false, disposed: false };
const draw = (time: number): void => {
	if (state.disposed) return;
	renderer.draw(
		((time % motionEffects.loadingPuckLoop) / motionEffects.loadingPuckLoop) *
			Math.PI *
			2,
		state.dark,
	);
	requestAnimationFrame(draw);
};
requestAnimationFrame(draw);
for (const button of Array.from(document.querySelectorAll("button[data-mode]")))
	button.addEventListener("click", (): void => {
		state.dark = button.getAttribute("data-mode") === "dark";
		renderer.draw(0, state.dark);

		canvas.toBlob((blob): void => {
			if (!blob) throw new Error("Puck launch frame could not export.");
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = `loading-puck-${state.dark ? "dark" : "light"}.png`;
			link.click();
		}, "image/png");
	});
window.addEventListener(
	"pagehide",
	(): void => {
		state.disposed = true;
		renderer.dispose();
	},
	{ once: true },
);
