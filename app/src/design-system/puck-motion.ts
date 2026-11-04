export const advancePuckPhase = (
	phase: number,
	elapsed: number,
	loopDuration: number,
): number =>
	(phase +
		(Math.min(Math.max(0, elapsed), 1000 / 30) / loopDuration) * Math.PI * 2) %
	(Math.PI * 2);
