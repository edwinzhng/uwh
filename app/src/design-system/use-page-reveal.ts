import { useFocusEffect } from "expo-router";
import { useCallback, useLayoutEffect, useRef } from "react";

export const usePageReveal = ({
	replayOnFocus,
	replayKey,
	nested,
	reveal,
	stop,
}: {
	replayOnFocus: boolean;
	replayKey?: string;
	nested: boolean;
	reveal: () => void;
	stop: () => void;
}): void => {
	const previousKey = useRef(replayKey);
	const playback = useRef({ reveal, stop });
	playback.current = { reveal, stop };
	useFocusEffect(
		useCallback(() => {
			if (!replayOnFocus) return;
			playback.current.reveal();
			return (): void => playback.current.stop();
		}, [replayOnFocus]),
	);
	useLayoutEffect(() => {
		if (replayOnFocus) return;
		const changed = previousKey.current !== replayKey;
		previousKey.current = replayKey;
		if (!nested || changed) playback.current.reveal();
		else playback.current.stop();
		return (): void => playback.current.stop();
	}, [replayKey, replayOnFocus, nested]);
};
