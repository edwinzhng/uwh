import { expect, test } from "bun:test";
import {
	nativeHeaderRoute,
	nativeRouteTitle,
	nativeTabsComponents,
} from "../src/design-system/native-navigation-model";

test("native detail pages keep native back controls without exposing a fifth primary tab", (): void => {
	for (const name of [
		"account",
		"account-settings",
		"session",
		"member",
		"conversation",
		"fitness",
	])
		expect(nativeHeaderRoute(name)).toBe(true);
	for (const name of [
		"",
		"(tabs)",
		"join",
		"auth-callback",
		"review-auth",
		"otp-test",
	])
		expect(nativeHeaderRoute(name)).toBe(false);
	expect(nativeRouteTitle("member")).toBe("Profile");
	expect(nativeRouteTitle("account-settings")).toBe("Account settings");
	expect(nativeRouteTitle("resources")).toBe("Resources");
});

test("native tabs check both compiled host and screen components before selecting the native adapter", async (): Promise<void> => {
	expect(nativeTabsComponents("ios")).toEqual([
		"RNSTabsHostIOS",
		"RNSTabsScreenIOS",
	]);
	expect(nativeTabsComponents("android")).toEqual([
		"RNSTabsHostAndroid",
		"RNSTabsScreenAndroid",
	]);
	expect(nativeTabsComponents("web")).toEqual([]);
	const adapter = await Bun.file(
		"src/design-system/main-tabs.native.tsx",
	).text();
	expect(adapter).toContain("if (!nativeTabsAvailable())");
	expect(adapter).toContain("<MainTabsFallback unread={unread}");
	for (const route of ["index", "schedule", "messages", "club"])
		expect(adapter).toMatch(
			new RegExp(`NativeTabs.Trigger\\s+name="${route}"`),
		);
	expect(adapter).not.toContain('name="account"');
	expect(adapter).toContain("NativeTabs.Trigger.Badge");
	expect(adapter).toContain("if (!event.data.isPrevented) haptic()");
});

test("native navigation owns page push and interactive back without a second custom animation", async (): Promise<void> => {
	const [router, layout, frame, retention] = await Promise.all([
		Bun.file("src/design-system/app-router.native.tsx").text(),
		Bun.file("src/design-system/app-layout.tsx").text(),
		Bun.file("src/design-system/navigation-frame.tsx").text(),
		Bun.file("src/design-system/native-tab-content.native.tsx").text(),
	]);
	expect(router).toContain('animation: animate ? "fade" : "none"');
	expect(router).toContain("gestureEnabled: true");
	expect(router).toContain("fullScreenGestureEnabled: false");
	expect(router).toContain('presentation: "card"');
	expect(layout).toContain('transition !== "instant" && !nativeHeader');
	expect(frame).toContain("!nativeTabsAvailable()");
	expect(retention).toContain("if (focused) setActivated(true)");
	expect(retention).toContain("activated || focused");
	expect(retention).not.toContain("setActivated(false)");
	const root = await Bun.file("app/_layout.tsx").text();
	expect(root).toContain('anchor: "(tabs)"');
});

test("native glass selections use adaptive blue for both icon and label and share the app appearance", async (): Promise<void> => {
	const adapter = await Bun.file(
		"src/design-system/main-tabs.native.tsx",
	).text();
	expect(adapter).toContain("DynamicColorIOS({");
	expect(adapter).toContain("light: lightTheme.navigation.indicator");
	expect(adapter).toContain("dark: darkTheme.navigation.indicator");
	expect(adapter).toContain("highContrastLight: lightTheme.focus");
	expect(adapter).toContain("iconColor={colors}");
	expect(adapter).toContain("selected: { color: colors.selected }");
	expect(adapter).toContain("tintColor={colors.selected}");
	expect(adapter).toContain(
		"unstable_nativeProps={{ colorScheme: theme.mode }}",
	);
	expect(adapter).not.toContain("tintColor={theme.text.primary}");
	expect(adapter).not.toContain("blurEffect=");
	expect(adapter).not.toContain("backgroundColor=");
});

test("transparent native headers reserve scroll clearance without adding keyboard padding", async (): Promise<void> => {
	const layout = await Bun.file("src/design-system/app-layout.tsx").text();
	expect(layout).toContain(
		'HeaderHeightContext } from "expo-router/react-navigation"',
	);
	expect(layout).toContain("useContext(HeaderHeightContext) ?? 0");
	expect(layout).toContain("keyboardVerticalOffset={0}");
	expect(layout).not.toContain(
		"keyboardVerticalOffset={nativeHeader ? headerHeight : 0}",
	);
	expect(layout).toContain("contentInsetAdjustmentBehavior={");
	expect(layout).toContain("nativeNavigation || nativeHeader");
	expect(layout).toContain("workspace\n");
});

test("native navigation is nested inside authentication and terms gates", async (): Promise<void> => {
	const [root, provider, terms] = await Promise.all([
		Bun.file("app/_layout.tsx").text(),
		Bun.file("src/backend/provider.tsx").text(),
		Bun.file("src/features/terms-gate.tsx").text(),
	]);
	expect(root).toContain("<BackendProvider>");
	expect(root).toContain("<AppNavigation>");
	expect(root).toContain("<AppRouter />");
	expect(provider).toContain("<LoadingScreen />");
	expect(provider).toContain("<TermsGate>");
	expect(provider).toContain("<AccountGate />");
	expect(provider).toMatch(/\{children\}\s*<\/TermsGate>/);
	expect(terms).toContain("if (service.state.accepted) return <>{children}</>");
	expect(terms).toContain('<AuthLayout title="Review club terms">');
});

test("page headers have no opaque bar and shared toolbar controls float above content", async (): Promise<void> => {
	const [router, layout] = await Promise.all([
		Bun.file("src/design-system/app-router.native.tsx").text(),
		Bun.file("src/design-system/app-layout.tsx").text(),
	]);
	expect(router).toContain("headerTransparent: true");
	expect(router).toContain('headerTitle: ""');
	expect(router).toContain('headerStyle: { backgroundColor: "transparent" }');
	expect(router).not.toContain(
		"headerStyle: { backgroundColor: theme.background",
	);
	expect(layout).toContain('pointerEvents="box-none"');
	expect(layout).toContain("zIndex: layer.sticky");
	expect(layout).toContain("toolbarClearance");
});

test("native header controls use the system glass without nesting another glass panel", async (): Promise<void> => {
	const layout = await Bun.file("src/design-system/app-layout.tsx").text();
	const group = await Bun.file("src/design-system/toolbar-group.tsx").text();
	const button = await Bun.file(
		"src/design-system/toolbar-button-available.ios.tsx",
	).text();
	expect(layout).toContain("<ToolbarGroup nativeHeader>");
	expect(layout).toContain("<ToolbarGroup>");
	expect(group).toContain("return nativeHeader ? (");
	expect(group).toContain("nativeHeader = false");
	expect(button).toContain('buttonStyle("plain")');
});
