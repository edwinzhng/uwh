import {
	type ReactElement,
	type ReactNode,
	useCallback,
	useRef,
	useState,
} from "react";
import { PopupContainerContext } from "./popup-container";

export const PopupPortalProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const [container, setContainer] = useState<HTMLDivElement>();
	const suppressEscapeRelease = useRef(false);
	const assignContainer = useCallback(
		(element: HTMLDivElement | null): void =>
			setContainer(element ?? undefined),
		[],
	);
	return (
		<PopupContainerContext value={container}>
			<div
				ref={assignContainer}
				data-club-popup-host
				style={{
					display: "flex",
					flexDirection: "column",
					flex: 1,
					minHeight: 0,
					position: "relative",
				}}
				onKeyDownCapture={(event): void => {
					if (
						event.key === "Escape" &&
						event.currentTarget.querySelector("[data-club-popup][data-open]")
					)
						suppressEscapeRelease.current = true;
				}}
				onKeyUpCapture={(event): void => {
					if (event.key === "Escape" && suppressEscapeRelease.current) {
						event.stopPropagation();
						suppressEscapeRelease.current = false;
					}
				}}
			>
				{children}
			</div>
		</PopupContainerContext>
	);
};
