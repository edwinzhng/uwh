import { expect, test } from "bun:test";

test("primary destinations remain mounted in lazy, frozen fallback tabs", async (): Promise<void> => {
	const layout = await Bun.file(
		"src/design-system/main-tabs-fallback.tsx",
	).text();
	expect(layout).toContain("freezeOnBlur: true");
	expect(layout).toContain("lazy: true");
	expect(layout).toContain('animation: "none"');
	for (const route of ["index", "schedule", "messages", "club"]) {
		expect(layout).toContain(`name="${route}"`);
		expect(await Bun.file(`app/(tabs)/${route}.tsx`).exists()).toBe(true);
		expect(await Bun.file(`app/${route}.tsx`).exists()).toBe(false);
	}
	expect(await Bun.file("app/account.tsx").exists()).toBe(true);
	expect(await Bun.file("app/(tabs)/account.tsx").exists()).toBe(false);
});

test("Home avoids a live shader and loading feedback has no artificial delay", async (): Promise<void> => {
	const home = await Bun.file("src/features/home-screen.tsx").text();
	const loading = await Bun.file(
		"src/design-system/loading-content.tsx",
	).text();
	expect(home).not.toContain('backdrop="grain"');
	expect(loading).not.toContain("setTimeout");
});

test("loaders share the platform reveal owner without artificial waits", async (): Promise<void> => {
	for (const name of ["button-spinner"]) {
		const source = await Bun.file(`src/design-system/${name}.tsx`).text();
		expect(source).toContain("ContentReveal");
		expect(source).not.toContain("setTimeout");
	}
	const native = await Bun.file("src/design-system/content-reveal.tsx").text();
	expect(native).toContain("motion.duration.slow");
	expect(native).toContain("motion.easing.out");
	expect(native).toContain("ReduceMotion.System");
	const web = await Bun.file("src/design-system/content-reveal.web.tsx").text();
	expect(web).toContain("animation?.cancel()");
	expect(web).not.toContain("requestAnimationFrame");
});

test("page transitions fade in without layout motion and respect reduced motion", async (): Promise<void> => {
	const reveal = await Bun.file("src/design-system/page-reveal.tsx").text();
	expect(reveal).toContain("opacity.set(0)");
	expect(reveal).toContain("cancelAnimation(opacity)");
	expect(reveal).toContain("ReduceMotion.System");
	expect(reveal).toContain("motion.duration.slow");
	expect(reveal).not.toContain("translateY");
});

test("contact privacy is explained once without changing the contact visibility gate", async (): Promise<void> => {
	const profile = await Bun.file("src/features/member-profile-card.tsx").text();
	expect(profile).toContain("Private phone:");
	expect(profile).not.toContain("household only");
	expect(profile).toContain("profile?.contact?.phone ?");
});

test("water loaders render live geometry without image loops or delayed text entrances", async (): Promise<void> => {
	const orb = await Bun.file("src/design-system/loading-puck.tsx").text();
	expect(orb).toContain("GLView");
	expect(orb).toContain("cancelAnimationFrame");
	expect(orb).not.toContain(".gif");
	for (const name of ["loading-screen"]) {
		const source = await Bun.file(`src/design-system/${name}.tsx`).text();
		expect(source).toContain("LoadingPuck");
		expect(source).not.toContain("ContentReveal");
	}
});
