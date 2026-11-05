import { atom, useAtomValue } from "jotai";
import {
	type ReactElement,
	type ReactNode,
	useContext,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { View } from "react-native";
import {
	LoadingPageContext,
	loadingRequestsAtom,
	PageContentReadyContext,
} from "./loading-state";
import { createPageReadiness } from "./page-readiness";
import { usePageLoading } from "./use-page-loading";

export const PageReady = ({
	children,
	loading = false,
	layoutKey,
	contentKey = "",
	fill = true,
	registerWithParent = false,
	waitForLayout = true,
}: {
	children: ReactNode;
	loading?: boolean;
	layoutKey: string;
	contentKey?: string;
	fill?: boolean;
	registerWithParent?: boolean;
	waitForLayout?: boolean;
}): ReactElement => {
	const id = useId();
	const parentReady = useContext(PageContentReadyContext) ?? true;
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
	const latestKey = useRef(contentKey);
	latestKey.current = contentKey;
	const [revealedKey, setRevealedKey] = useState<string>();
	const ready = revealedKey === contentKey && !loading;
	usePageLoading(registerWithParent && (loading || pending));
	const controller = useMemo(
		() =>
			createPageReadiness({
				waitForLayout,
				onChange: (shown): void =>
					setRevealedKey(shown ? latestKey.current : undefined),
				scheduleFrame: (callback): (() => void) => {
					const frame = requestAnimationFrame(callback);
					return (): void => cancelAnimationFrame(frame);
				},
			}),
		[waitForLayout],
	);
	useLayoutEffect(
		(): void => controller.update(loading, pending, contentKey),
		[controller, loading, pending, contentKey],
	);
	useLayoutEffect(() => (): void => controller.dispose(), [controller]);
	useLayoutEffect((): void => {
		if (layoutKey) controller.layout();
	}, [controller, layoutKey]);
	return (
		<LoadingPageContext value={id}>
			<PageContentReadyContext value={ready && parentReady}>
				<View style={{ flex: fill ? 1 : undefined, minHeight: 0 }}>
					<View
						testID="club-page-content"
						onLayout={controller.layout}
						pointerEvents={ready ? "auto" : "none"}
						accessibilityElementsHidden={!ready}
						importantForAccessibility={ready ? "auto" : "no-hide-descendants"}
						style={{
							flex: fill ? 1 : undefined,
							minHeight: 0,
							opacity: ready ? 1 : 0,
						}}
					>
						{children}
					</View>
				</View>
			</PageContentReadyContext>
		</LoadingPageContext>
	);
};
