import { atom, useAtomValue } from "jotai";
import {
	type ReactElement,
	type ReactNode,
	useId,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { View } from "react-native";
import { LoadingPageContext, loadingRequestsAtom } from "./loading-state";
import { createPageReadiness } from "./page-readiness";

export const PageReady = ({
	children,
	loading = false,
	layoutKey,
}: {
	children: ReactNode;
	loading?: boolean;
	layoutKey: string;
}): ReactElement => {
	const id = useId();
	const pendingAtom = useMemo(
		() =>
			atom((get): boolean =>
				Object.values(get(loadingRequestsAtom)).some(
					(request) => request.pageId === id,
				),
			),
		[id],
	);
	const pending = useAtomValue(pendingAtom);
	const [ready, setReady] = useState(false);
	const controller = useMemo(
		() =>
			createPageReadiness({
				onChange: setReady,
				scheduleFrame: (callback): (() => void) => {
					const frame = requestAnimationFrame(callback);
					return (): void => cancelAnimationFrame(frame);
				},
			}),
		[],
	);
	useLayoutEffect(
		(): void => controller.update(loading, pending),
		[controller, loading, pending],
	);
	useLayoutEffect(() => (): void => controller.dispose(), [controller]);
	useLayoutEffect((): void => {
		if (layoutKey) controller.layout();
	}, [controller, layoutKey]);
	return (
		<LoadingPageContext value={id}>
			<View style={{ flex: 1, minHeight: 0 }}>
				<View
					onLayout={controller.layout}
					pointerEvents={ready ? "auto" : "none"}
					accessibilityElementsHidden={!ready}
					importantForAccessibility={ready ? "auto" : "no-hide-descendants"}
					style={{ flex: 1, minHeight: 0, opacity: ready ? 1 : 0 }}
				>
					{children}
				</View>
			</View>
		</LoadingPageContext>
	);
};
