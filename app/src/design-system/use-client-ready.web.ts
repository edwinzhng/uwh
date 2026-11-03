import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => (): void => undefined;
const clientSnapshot = (): boolean => true;
const serverSnapshot = (): boolean => false;
export const useClientReady = (): boolean =>
	useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
