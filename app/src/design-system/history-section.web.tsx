import { type ReactElement, useLayoutEffect, useRef } from "react";
import { HistorySectionHeader } from "./history-section-header";
import type { HistorySectionProps } from "./history-section-props";
import { space } from "./tokens";

const scrollOwner = (element: HTMLElement): Element => {
	const owner = element.parentElement;
	if (!owner) return document.scrollingElement ?? document.documentElement;
	const overflow = getComputedStyle(owner).overflowY;
	return /auto|scroll/.test(overflow) && owner.scrollHeight > owner.clientHeight
		? owner
		: scrollOwner(owner);
};
export const HistorySection = ({
	children,
	loadMore,
	loading,
	revision,
	treatment,
}: HistorySectionProps): ReactElement => {
	const root = useRef<HTMLDivElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const current = useRef({ loadMore, loading });
	current.current = { loadMore, loading };
	const pending = useRef<
		{ anchor: Element; top: number; scroll: Element } | undefined
	>(undefined);
	const requesting = useRef(false);
	const request = (): void => {
		if (
			requesting.current ||
			!root.current ||
			current.current.loading ||
			!current.current.loadMore
		)
			return;
		requesting.current = true;
		const anchor = content.current?.querySelector('a,[role="link"],button');
		if (anchor)
			pending.current = {
				anchor,
				top: anchor.getBoundingClientRect().top,
				scroll: scrollOwner(root.current),
			};
		current.current.loadMore();
	};
	useLayoutEffect(() => {
		if (!loading) requesting.current = false;
		const saved = pending.current;
		if (revision < 1) return;
		if (!saved || loading) return;
		if (saved.anchor.isConnected) {
			const delta = saved.anchor.getBoundingClientRect().top - saved.top;
			saved.scroll.scrollTop += delta;
		}
		pending.current = undefined;
	}, [revision, loading]);

	return (
		<div
			ref={root}
			style={{
				minWidth: 0,
				overflowAnchor: "none",
				display: "flex",
				flexDirection: "column",
				gap: space.xs,
			}}
		>
			<HistorySectionHeader
				treatment={treatment}
				loadMore={loadMore ? request : undefined}
				loading={loading}
			/>
			<div ref={content}>{children}</div>
		</div>
	);
};
