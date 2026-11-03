import { describe, expect, test } from "bun:test";
import config from "../app.config";
import { loadingColors } from "../src/design-system/loading-colors";
import { lightTheme } from "../src/design-system/tokens";

const imageGeometry = async (
	path: string,
): Promise<{ width: number; height: number; colorType: number }> => {
	const file = Bun.file(new URL(`../${path}`, import.meta.url));
	const bytes = new DataView(await file.arrayBuffer());
	expect(bytes.getUint32(0)).toBe(0x89504e47);
	return {
		width: bytes.getUint32(16),
		height: bytes.getUint32(20),
		colorType: bytes.getUint8(25),
	};
};

describe("Crocs app branding", () => {
	test("uses one opaque 1024px launcher source for native and generated web icons", async (): Promise<void> => {
		const path = "./assets/app-icon.png";
		expect(config.icon).toBe(path);
		expect(config.web?.favicon).toBe(path);
		expect(await imageGeometry(path)).toEqual({
			width: 1024,
			height: 1024,
			colorType: 2,
		});
		expect(
			await Bun.file(
				new URL("../assets/app-icon.png", import.meta.url),
			).exists(),
		).toBe(true);
	});

	test("keeps native launch dark in both device appearances", (): void => {
		const splash = config.plugins?.find(
			(plugin) =>
				Array.isArray(plugin) && plugin.at(0) === "expo-splash-screen",
		);
		expect(splash).toEqual([
			"expo-splash-screen",
			{
				backgroundColor: loadingColors.canvas,
				image: "./assets/loading/loading-puck-dark.png",
				imageWidth: 320,
				resizeMode: "contain",
				dark: {
					backgroundColor: loadingColors.canvas,
					image: "./assets/loading/loading-puck-dark.png",
				},
			},
		]);
	});

	test("declares existing correctly sized versioned PWA icons without old logo references", async (): Promise<void> => {
		const manifest: {
			background_color: string;
			theme_color: string;
			icons: { src: string; sizes: string; type: string }[];
		} = await Bun.file(
			new URL("../public/manifest.webmanifest", import.meta.url),
		).json();
		expect(manifest.background_color).toBe(lightTheme.background.canvas);
		expect(manifest.theme_color).toBe(lightTheme.background.canvas);
		expect(manifest.icons.map((icon) => icon.src)).toEqual([
			"/crocs-app-v1-192.png",
			"/crocs-app-v1-512.png",
		]);
		for (const icon of manifest.icons) {
			const size = await imageGeometry(`public${icon.src}`);
			expect(`${size.width}x${size.height}`).toBe(icon.sizes);
			expect(icon.type).toBe("image/png");
		}
	});

	test("uses matching small-icon and Apple artwork in the actual HTML head", async (): Promise<void> => {
		const document = await Bun.file(
			new URL("../src/design-system/web-document.tsx", import.meta.url),
		).text();
		expect(document).toContain("/crocs-app-v1-favicon.png");
		expect(document).toContain("/crocs-app-v1-apple.png");
		expect(document).not.toContain("club-logo");
		expect(await imageGeometry("public/crocs-app-v1-favicon.png")).toEqual({
			width: 32,
			height: 32,
			colorType: 2,
		});
		expect(await imageGeometry("public/crocs-app-v1-apple.png")).toEqual({
			width: 180,
			height: 180,
			colorType: 2,
		});
	});
});
