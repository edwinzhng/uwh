import { type ReactElement, useRef } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { PaginationActivity, usePaginationSignal } from "./pagination-signal";
import { PaginationViewport } from "./pagination-viewport";

export const PaginationScrollView = ({
	children,
	...props
}: ScrollViewProps): ReactElement => {
	const signal = usePaginationSignal();
	const viewport = useRef<ScrollView>(null);
	return (
		<PaginationViewport.Provider value={viewport}>
			<PaginationActivity value={signal}>
				<ScrollView
					ref={viewport}
					{...props}
					scrollEventThrottle={props.scrollEventThrottle ?? 64}
					onScroll={(event): void => {
						props.onScroll?.(event);
						signal.notify();
					}}
					onLayout={(event): void => {
						props.onLayout?.(event);
						signal.notify();
					}}
					onContentSizeChange={(width, height): void => {
						props.onContentSizeChange?.(width, height);
						signal.notify();
					}}
				>
					{children}
				</ScrollView>
			</PaginationActivity>
		</PaginationViewport.Provider>
	);
};
