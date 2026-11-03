import { type ScrollRange, scrollOffsetToReveal } from "./scroll-visibility";

export type ScrollRevealIntent = "activation" | "layout";
export type ScrollRevealRequest = {
	range: ScrollRange;
	intent: ScrollRevealIntent;
};

export const coalesceScrollReveal = (
	previous: ScrollRevealRequest | undefined,
	next: ScrollRevealRequest,
): ScrollRevealRequest =>
	previous?.intent === "activation" && next.intent === "layout"
		? previous
		: next;

export const scrollRevealDestination = ({
	request,
	offset,
	target,
	viewportSize,
	contentSize,
	interrupted,
}: {
	request: ScrollRevealRequest;
	offset: number;
	target?: number;
	viewportSize: number;
	contentSize: number;
	interrupted: boolean;
}): number | undefined => {
	if (
		(interrupted && request.intent === "layout") ||
		!Number.isFinite(viewportSize) ||
		!Number.isFinite(contentSize) ||
		viewportSize <= 0 ||
		contentSize <= 0
	)
		return undefined;
	const anchor = target ?? offset;
	if (!Number.isFinite(anchor)) return undefined;
	const next = scrollOffsetToReveal({
		...request.range,
		offset: anchor,
		viewportSize,
		contentSize,
	});
	return Math.abs(next - anchor) <= 1 ? undefined : next;
};
