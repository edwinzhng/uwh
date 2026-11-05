import { useEffect, useRef } from "react";
import type { LineupSnapshot } from "../domain/lineup";

export const useLineupAutosave = ({
	snapshot,
	enabled,
	save,
}: {
	snapshot: LineupSnapshot;
	enabled: boolean;
	save: () => Promise<boolean>;
}): void => {
	const latest = useRef({ enabled, save, snapshot });
	latest.current = { enabled, save, snapshot };
	useEffect(() => {
		if (!enabled) return;
		const timer = setTimeout((): void => {
			if (latest.current.enabled && latest.current.snapshot === snapshot)
				void latest.current.save();
		}, 650);
		return (): void => clearTimeout(timer);
	}, [snapshot, enabled]);
	useEffect(
		() => (): void => {
			if (latest.current.enabled) void latest.current.save();
		},
		[],
	);
};
