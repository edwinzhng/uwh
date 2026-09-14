import { useSyncExternalStore } from "react";
import { control, geometry } from "./tokens";

const subscribe = (onChange: () => void): (() => void) => {
	const query = window.matchMedia(control.touchQuery);
	query.addEventListener("change", onChange);
	return (): void => query.removeEventListener("change", onChange);
};

const getSnapshot = (): boolean =>
	window.matchMedia(control.touchQuery).matches;
const getServerSnapshot = (): boolean => false;

export const useControlSize = (): number =>
	useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
		? geometry.touch
		: control.height;
