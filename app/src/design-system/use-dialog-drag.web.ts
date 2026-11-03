import { useMemo, useRef } from "react";
import { PanResponder } from "react-native";
import {
	Easing,
	ReduceMotion,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import type { DialogDragOptions, DialogDragResult } from "./dialog-drag-types";
import {
	canStartSheetDrag,
	dialogTransitionDuration,
	sheetDragOffset,
	shouldDismissSheet,
} from "./dialog-state";
import { motion } from "./tokens";

export const useDialogDrag = (options: DialogDragOptions): DialogDragResult => {
	const current = useRef(options);
	current.current = options;
	const offset = useSharedValue(0);
	const responder = useMemo(() => {
		const settle = (): void => {
			offset.set(
				withTiming(0, {
					duration: dialogTransitionDuration(current.current.animate),
					easing: Easing.bezier(...motion.easing.emphasized),
					reduceMotion: ReduceMotion.System,
				}),
			);
		};
		return PanResponder.create({
			onMoveShouldSetPanResponder: (event, gesture): boolean => {
				const capture =
					current.current.enabled && canStartSheetDrag(gesture.dx, gesture.dy);
				if (capture) event.preventDefault();
				return capture;
			},
			onPanResponderMove: (event, gesture): void => {
				event.preventDefault();
				offset.set(sheetDragOffset(gesture.dy));
			},
			onPanResponderRelease: (_event, gesture): void => {
				if (current.current.enabled && shouldDismissSheet(gesture.dy))
					current.current.onDismiss();
				settle();
			},
			onPanResponderTerminationRequest: (): boolean => true,
			onPanResponderTerminate: settle,
		});
	}, [offset]);
	return { handlers: responder.panHandlers, offset };
};
