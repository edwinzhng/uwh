import { expect, test } from "bun:test";
import { inspectInteractionBoundary } from "../scripts/interaction-boundary";

test("URL-backed controls cannot defer their body through direct router callbacks", (): void => {
	expect(
		inspectInteractionBoundary(
			"<Tabs onValueChange={(tab) => router.setParams({tab})} />",
			"features/example.tsx",
		),
	).toHaveLength(1);
	expect(
		inspectInteractionBoundary(
			"<Tabs onValueChange={selection.select} />",
			"features/example.tsx",
		),
	).toEqual([]);
});
test("tab readiness and roster filters cannot reset live content", (): void => {
	expect(
		inspectInteractionBoundary("<Fragment key={value} />", "tab-content.tsx"),
	).toHaveLength(1);
	expect(
		inspectInteractionBoundary(
			"<PageReady contentKey={value} />",
			"tab-content.tsx",
		),
	).toHaveLength(1);
	expect(
		inspectInteractionBoundary(
			"<SessionPeople key={partId} />",
			"event-screen.tsx",
		),
	).toHaveLength(1);
	expect(
		inspectInteractionBoundary("<TeamPlan key={partId} />", "team-panel.tsx"),
	).toEqual([]);
	expect(
		inspectInteractionBoundary(
			"<SessionPeople key={event.id} partId={partId} />",
			"event-screen.tsx",
		),
	).toEqual([]);
});
test("ordinary controls cannot schedule lower priority notifications", (): void => {
	expect(
		inspectInteractionBoundary(
			"startTransition(() => onValueChange(next))",
			"use-control-selection.ts",
		),
	).toHaveLength(1);
	expect(
		inspectInteractionBoundary(
			"onValueChange(next)",
			"use-control-selection.ts",
		),
	).toEqual([]);
});

test("chat message edges cannot reuse navigation blur overlays", (): void => {
	expect(
		inspectInteractionBoundary(
			'<ScrollEdgeBackdrop edge="bottom" />',
			"message-timeline.tsx",
		),
	).toHaveLength(1);
	expect(
		inspectInteractionBoundary(
			"<MessageViewport>{children}</MessageViewport>",
			"message-timeline.tsx",
		),
	).toEqual([]);
});
