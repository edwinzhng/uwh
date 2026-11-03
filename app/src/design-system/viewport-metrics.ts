export type ViewportMetrics = {
	width: number;
	height: number;
	top: number;
	keyboardVisible: boolean;
};

type ViewportInput = {
	width: number;
	height: number;
	visualHeight?: number;
	visualTop?: number;
	scale?: number;
	focused: boolean;
	baselineHeight: number;
};

export type ViewportObservation = Omit<ViewportInput, "baselineHeight">;
export type ViewportState = {
	baselineHeight: number;
	focused: boolean;
	metrics: ViewportMetrics;
};

export const viewportMetrics = ({
	width,
	height,
	visualHeight,
	visualTop = 0,
	scale = 1,
	focused,
	baselineHeight,
}: ViewportInput): ViewportMetrics => {
	const unscaled = Math.abs(scale - 1) < 0.01;
	const visibleHeight =
		unscaled && visualHeight !== undefined && Number.isFinite(visualHeight)
			? Math.min(height, Math.max(0, visualHeight))
			: height;
	return {
		width,
		height: visibleHeight,
		top: unscaled ? Math.max(0, visualTop) : 0,
		keyboardVisible:
			focused &&
			unscaled &&
			Math.max(height, baselineHeight) - visibleHeight >=
				Math.max(100, baselineHeight * 0.15),
	};
};

export const trackViewport = (
	previous: ViewportState | undefined,
	input: ViewportObservation,
): ViewportState => {
	const widthChanged = previous && previous.metrics.width !== input.width;
	const rotated =
		previous &&
		(previous.metrics.width <= previous.baselineHeight
			? input.width >= previous.baselineHeight
			: input.width <= previous.baselineHeight);
	const baselineHeight =
		!previous || !input.focused
			? input.height
			: widthChanged
				? previous.metrics.keyboardVisible
					? rotated
						? Math.max(input.height, previous.metrics.width)
						: previous.baselineHeight
					: input.height
				: previous.baselineHeight;
	const metrics = viewportMetrics({ ...input, baselineHeight });
	return previous &&
		previous.baselineHeight === baselineHeight &&
		previous.focused === input.focused &&
		previous.metrics.width === metrics.width &&
		previous.metrics.height === metrics.height &&
		previous.metrics.top === metrics.top &&
		previous.metrics.keyboardVisible === metrics.keyboardVisible
		? previous
		: { baselineHeight, focused: input.focused, metrics };
};
