import { type ReactElement, useEffect, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import type { InfiniteScrollProps } from "./infinite-scroll-props";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";
import { useInfiniteRequest } from "./use-infinite-request";
import { useScreenActive } from "./use-screen-active";

export const InfiniteScroll = (props: InfiniteScrollProps): ReactElement => {
	const marker = useRef<HTMLDivElement>(null);
	const theme = useTheme();
	const [visible, setVisible] = useState(false);
	const request = useInfiniteRequest(props);
	const active = useScreenActive();
	useEffect(() => {
		if (!active) {
			setVisible(false);
			return;
		}
		if (!marker.current) return;
		const observer = new IntersectionObserver(
			(entries): void => {
				setVisible(entries.some((entry) => entry.isIntersecting));
			},
			{ rootMargin: `${space.xxl}px` },
		);
		observer.observe(marker.current);
		return (): void => observer.disconnect();
	}, [active]);
	useEffect((): void => {
		if (active && visible) request();
	}, [active, visible, request]);
	return (
		<div
			ref={marker}
			style={{
				minHeight: props.loadMore || props.loading ? geometry.touch : 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: props.loadMore || props.loading ? space.xs : 0,
			}}
		>
			{props.loading ? (
				<ActivityIndicator
					accessibilityLabel="Loading more"
					color={theme.text.secondary}
				/>
			) : undefined}
		</div>
	);
};
