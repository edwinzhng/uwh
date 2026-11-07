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

describe("UWH Club app branding", () => {
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
			"/uwhclub-app-v1-192.png",
			"/uwhclub-app-v1-512.png",
		]);
		for (const icon of manifest.icons) {
			const size = await imageGeometry(`public${icon.src}`);
			expect(`${size.width}x${size.height}`).toBe(icon.sizes);
			expect(icon.type).toBe("image/png");
		}
	});
});
