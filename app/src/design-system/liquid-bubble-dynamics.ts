import { motion } from "./tokens";

export const liquidBubbleLimit = 64;
export type LiquidBubbleFrame = {
	x: number;
	y: number;
	width: number;
	height: number;
};
export type LiquidBubbleDrag = {
	id: string;
	x: number;
	y: number;
	velocityX: number;
	velocityY: number;
};
type Body = {
	x: number;
	y: number;
	stretch: number;
	angle: number;
	velocityX: number;
	velocityY: number;
	stretchVelocity: number;
};
type LiquidFrame = { data: Float32Array; count: number; moving: boolean };
export type LiquidBubbleDynamics = {
	update: (
		frames: ReadonlyMap<string, LiquidBubbleFrame>,
		drag: LiquidBubbleDrag | undefined,
		delta: number,
		reduced: boolean,
	) => { data: Float32Array; count: number; moving: boolean };
};

export const createLiquidBubbleDynamics = (): LiquidBubbleDynamics => {
	const bodies = new Map<string, Body>();
	const data = new Float32Array(liquidBubbleLimit * 8);
	return {
		update: (frames, drag, delta, reduced): LiquidFrame => {
			const step = Math.min(1 / 30, Math.max(0, delta));
			const frequency = (Math.PI * 2) / (motion.duration.extended / 1000);
			const stiffness = frequency * frequency;
			const damping = frequency * 1.3;
			const state = { count: 0, moving: false };
			for (const [id, frame] of frames) {
				if (state.count >= liquidBubbleLimit) break;
				const held = drag?.id === id ? drag : undefined;
				const targetX = frame.x + frame.width / 2 + (held?.x ?? 0);
				const targetY = frame.y + frame.height / 2 + (held?.y ?? 0);
				const body = bodies.get(id) ?? {
					x: targetX,
					y: targetY,
					stretch: 1,
					angle: 0,
					velocityX: 0,
					velocityY: 0,
					stretchVelocity: 0,
				};
				const speed = held ? Math.hypot(held.velocityX, held.velocityY) : 0;
				const stretch = reduced ? 1 : 1 + Math.min(speed / 3500, 0.22);
				const angle =
					held && speed > 20
						? Math.atan2(held.velocityY, held.velocityX)
						: body.angle;

				if (held || reduced) {
					body.x = targetX;
					body.y = targetY;
					body.velocityX = reduced ? 0 : (held?.velocityX ?? 0) * 0.05;
					body.velocityY = reduced ? 0 : (held?.velocityY ?? 0) * 0.05;
				} else {
					body.velocityX +=
						((targetX - body.x) * stiffness - body.velocityX * damping) * step;
					body.velocityY +=
						((targetY - body.y) * stiffness - body.velocityY * damping) * step;
					body.x += body.velocityX * step;
					body.y += body.velocityY * step;
				}
				body.stretchVelocity = reduced
					? 0
					: body.stretchVelocity +
						((stretch - body.stretch) * stiffness -
							body.stretchVelocity * damping) *
							step;
				body.stretch = reduced ? 1 : body.stretch + body.stretchVelocity * step;
				body.angle = angle;
				bodies.set(id, body);
				if (
					Math.abs(targetX - body.x) +
						Math.abs(targetY - body.y) +
						Math.abs(stretch - body.stretch) * 100 +
						Math.abs(body.velocityX) +
						Math.abs(body.velocityY) +
						Math.abs(body.stretchVelocity) * 100 >
					0.05
				)
					state.moving = true;
				const offset = state.count * 8;
				data.set(
					[
						body.x,
						body.y,
						frame.width / 2,
						frame.height / 2,
						Math.min(frame.width, frame.height) / 2,
						body.stretch,
						body.angle,
						reduced ? 5 : 5 + Math.max(0, body.stretch - 1) * 80,
					],
					offset,
				);
				state.count += 1;
			}
			for (const id of bodies.keys()) if (!frames.has(id)) bodies.delete(id);
			return { ...state, data };
		},
	};
};
