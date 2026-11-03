import { atom, useStore } from "jotai";
import { lightNativeHaptic, nativeHapticsAvailable } from "./native-haptics";

export const hapticsEnabledAtom = atom(true);
export const hapticsAvailable = nativeHapticsAvailable;
export const useButtonHaptics = (): (() => void) => {
	const store = useStore();
	return (): void => {
		void lightNativeHaptic(store.get(hapticsEnabledAtom));
	};
};
