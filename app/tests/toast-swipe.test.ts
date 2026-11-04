import { expect, test } from "bun:test";
import { toastSwipeDirection } from "../src/design-system/toast-swipe-motion";

const swipe = (
	x: number,
	y: number,
	velocityX = 0,
	velocityY = 0,
): ReturnType<typeof toastSwipeDirection> =>
	toastSwipeDirection({
		translationX: x,
		translationY: y,
		velocityX,
		velocityY,
	});

test("toasts dismiss left, right or down, including intentional quick flicks", (): void => {
	expect(swipe(-44, 4)).toBe("left");
	expect(swipe(44, -4)).toBe("right");
	expect(swipe(4, 44)).toBe("bottom");
	expect(swipe(-10, 0, -700)).toBe("left");
	expect(swipe(10, 0, 700)).toBe("right");
	expect(swipe(0, 10, 0, 700)).toBe("bottom");
});

test("short drags, cancelled flicks and upward gestures keep the toast", (): void => {
	for (const motion of [
		[0, 0, 0, 0],
		[20, 0, 0, 0],
		[-20, 0, 0, 0],
		[0, 20, 0, 0],
		[0, -80, 0, -900],
		[6, 0, 900, 0],
		[10, 0, -900, 0],
		[0, 10, 0, -900],
		[30, -80, 900, -900],
	])
		expect(
			swipe(motion.at(0) ?? 0, motion.at(1) ?? 0, motion.at(2), motion.at(3)),
		).toBeUndefined();
});
