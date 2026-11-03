import { useCallback, useEffect, useRef } from "react";
import type { ScrollView } from "react-native";
import {
	type AnimatedRef,
	cancelAnimation,
	Easing,
	ReduceMotion,
	type SharedValue,
	scrollTo,
	useAnimatedReaction,
	useAnimatedScrollHandler,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import {
	coalesceScrollReveal,
	type ScrollRevealIntent,
	type ScrollRevealRequest,
	scrollRevealDestination,
} from "./scroll-reveal";
import { useScrollRevealInput } from "./scroll-reveal-input";
import type { ScrollRange } from "./scroll-visibility";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";

export const useScrollReveal = ({
	scroll,
	enabled,
	horizontal,
	offset,
	viewport,
	content,
}: {
	scroll: AnimatedRef<ScrollView>;
	enabled: boolean;
	horizontal: boolean;
	offset: SharedValue<number>;
	viewport: SharedValue<number>;
	content: SharedValue<number>;
}): {
	reveal: (range: ScrollRange, intent?: ScrollRevealIntent) => void;
	interrupt: () => void;
	onScroll: ReturnType<typeof useAnimatedScrollHandler>;
} => {
	const animate = useMotion();
	const position = useSharedValue(0);
	const target = useSharedValue<number | undefined>(undefined);
	const interrupted = useSharedValue(false);
	const inputVersion = useSharedValue(0);
	const pending = useRef<
		{ request: ScrollRevealRequest; inputVersion: number } | undefined
	>(undefined);
	const scheduled = useRef<number | undefined>(undefined);
	const activeOptions = useRef({ animate });
	activeOptions.current = { animate };
	useAnimatedReaction(
		() => (enabled ? position.get() : undefined),
		(current, previous): void => {
			if (current !== undefined && typeof previous === "number")
				scrollTo(
					scroll,
					horizontal ? current : 0,
					horizontal ? 0 : current,
					false,
				);
		},
		[enabled, horizontal, position, scroll],
	);
	const interrupt = useCallback((): void => {
		if (scheduled.current !== undefined)
			cancelAnimationFrame(scheduled.current);
		scheduled.current = undefined;
		pending.current = undefined;
		inputVersion.set(inputVersion.get() + 1);
		interrupted.set(true);
		target.set(undefined);
		cancelAnimation(position);
	}, [inputVersion, interrupted, position, target]);
	useScrollRevealInput(scroll, enabled, interrupt);
	const reveal = useCallback(
		(range: ScrollRange, intent: ScrollRevealIntent = "activation"): void => {
			if (!enabled) return;
			const version = inputVersion.get();
			pending.current = {
				request: coalesceScrollReveal(
					pending.current?.inputVersion === version
						? pending.current.request
						: undefined,
					{ range, intent },
				),
				inputVersion: version,
			};
			if (scheduled.current !== undefined) return;
			scheduled.current = requestAnimationFrame((): void => {
				scheduled.current = undefined;
				const queued = pending.current;
				pending.current = undefined;
				if (!queued || queued.inputVersion !== inputVersion.get()) return;
				const { request } = queued;
				const current = offset.get();
				const next = scrollRevealDestination({
					request,
					offset: current,
					target: target.get(),
					viewportSize: viewport.get(),
					contentSize: content.get(),
					interrupted: interrupted.get(),
				});
				if (request.intent === "activation") interrupted.set(false);
				if (next === undefined) return;
				target.set(next);
				position.set(current);
				position.set(
					withTiming(
						next,
						{
							duration: activeOptions.current.animate
								? motion.duration.standard
								: motion.duration.instant,
							easing: Easing.bezier(...motion.easing.out),
							reduceMotion: ReduceMotion.System,
						},
						(finished): void => {
							if (finished && target.get() === next) target.set(undefined);
						},
					),
				);
			});
		},
		[
			content,
			enabled,
			inputVersion,
			interrupted,
			offset,
			position,
			target,
			viewport,
		],
	);
	useEffect(() => {
		if (animate) return;
		const next = target.get();
		cancelAnimation(position);
		target.set(undefined);
		if (next !== undefined) position.set(next);
	}, [animate, position, target]);
	useEffect(
		() => (): void => {
			if (scheduled.current !== undefined)
				cancelAnimationFrame(scheduled.current);
			pending.current = undefined;
			target.set(undefined);
			cancelAnimation(position);
		},
		[position, target],
	);
	const onScroll = useAnimatedScrollHandler({
		onScroll: (event): void => {
			offset.set(horizontal ? event.contentOffset.x : event.contentOffset.y);
			viewport.set(
				horizontal
					? event.layoutMeasurement.width
					: event.layoutMeasurement.height,
			);
			content.set(
				horizontal ? event.contentSize.width : event.contentSize.height,
			);
		},
		onBeginDrag: (): void => {
			if (!enabled) return;
			inputVersion.set(inputVersion.get() + 1);
			interrupted.set(true);
			target.set(undefined);
			cancelAnimation(position);
		},
	});
	return { reveal, interrupt, onScroll };
};
