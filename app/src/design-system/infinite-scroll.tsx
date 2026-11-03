import { type ReactElement, useContext, useEffect, useRef } from "react";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";
import type { InfiniteScrollProps } from "./infinite-scroll-props";
import { PaginationActivity } from "./pagination-signal";
import { PaginationViewport } from "./pagination-viewport";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";
import { useInfiniteRequest } from "./use-infinite-request";
import { useScreenActive } from "./use-screen-active";

export const InfiniteScroll = (props: InfiniteScrollProps): ReactElement => {
	const theme = useTheme();
	const marker = useRef<View>(null);
	const signal = useContext(PaginationActivity);
	const viewport = useContext(PaginationViewport);
	const { height } = useWindowDimensions();
	const focused = useScreenActive();
	const request = useInfiniteRequest(props);
	useEffect(() => {
		if (!focused || !props.loadMore || props.loading || props.disabled) return;
		const active = { current: true };
		const check = (): void => {
			marker.current?.measureInWindow((_x, y, _width, markerHeight): void => {
				if (!active.current || markerHeight <= 0) return;
				const within = (top: number, viewportHeight: number): void => {
					if (
						active.current &&
						viewportHeight > 0 &&
						y < top + viewportHeight + space.xxl &&
						y + markerHeight >= top - space.xxl
					)
						request();
				};
				if (viewport?.current)
					viewport.current
						.getNativeScrollRef()
						?.measureInWindow(
							(_left, top, _viewportWidth, viewportHeight): void =>
								within(top, viewportHeight),
						);
				else within(0, height);
			});
		};
		check();
		if (signal) {
			const unsubscribe = signal.subscribe(check);
			return (): void => {
				active.current = false;
				unsubscribe();
			};
		}
		const timer = setInterval(check, 250);
		return (): void => {
			active.current = false;
			clearInterval(timer);
		};
	}, [
		focused,
		props.loadMore,
		props.loading,
		props.disabled,
		height,
		viewport,
		signal,
		request,
	]);
	return (
		<View
			ref={marker}
			collapsable={false}
			style={{
				minHeight: props.loadMore || props.loading ? geometry.touch : 0,
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
		</View>
	);
};
