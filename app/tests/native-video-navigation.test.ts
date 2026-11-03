import { expect, test } from "bun:test";
import { nativeVideoNavigationAllowed } from "../src/domain/native-video-navigation";

test("native embedded videos cannot navigate to websites, other clips or custom schemes", () => {
	for (const embed of [
		"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
		"https://player.vimeo.com/video/123456789?h=abc123",
	]) {
		expect(
			nativeVideoNavigationAllowed(
				embed,
				`${embed}${embed.includes("?") ? "&" : "?"}playsinline=1`,
			),
		).toBe(true);
		expect(nativeVideoNavigationAllowed(embed, "about:blank")).toBe(true);
		for (const candidate of [
			"https://example.com/",
			"https://www.youtube-nocookie.com/",
			"https://www.youtube-nocookie.com/embed/aaaaaaaaaaa",
			"https://player.vimeo.com/video/987654321",
			"javascript:alert(1)",
			"intent://video",
			"file:///secret",
			"https://user:password@player.vimeo.com/video/123456789",
		])
			expect(nativeVideoNavigationAllowed(embed, candidate)).toBe(false);
	}
	expect(
		nativeVideoNavigationAllowed(
			"https://example.com/",
			"https://example.com/",
		),
	).toBe(false);
});
