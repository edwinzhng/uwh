type ProfilePoint = {
	radius: number;
	height: number;
	radialNormal: number;
	verticalNormal: number;
};
export type PuckGeometry = { vertices: Float32Array; indices: Uint16Array };
export const createPuckGeometry = (
	segments = 96,
	bevelSegments = 10,
): PuckGeometry => {
	const radius = 0.94;
	const height = 0.25;
	const bevel = 0.085;
	const profile: ProfilePoint[] = [
		{ radius: 0, height: -height, radialNormal: 0, verticalNormal: -1 },
		...Array.from({ length: bevelSegments + 1 }, (_, index): ProfilePoint => {
			const angle = -Math.PI / 2 + ((index / bevelSegments) * Math.PI) / 2;
			return {
				radius: radius - bevel + Math.cos(angle) * bevel,
				height: -height + bevel + Math.sin(angle) * bevel,
				radialNormal: Math.cos(angle),
				verticalNormal: Math.sin(angle),
			};
		}),
		...Array.from({ length: bevelSegments + 1 }, (_, index): ProfilePoint => {
			const angle = ((index / bevelSegments) * Math.PI) / 2;
			return {
				radius: radius - bevel + Math.cos(angle) * bevel,
				height: height - bevel + Math.sin(angle) * bevel,
				radialNormal: Math.cos(angle),
				verticalNormal: Math.sin(angle),
			};
		}),
		{ radius: 0, height, radialNormal: 0, verticalNormal: 1 },
	];
	const vertices = new Float32Array(
		profile.flatMap((point) =>
			Array.from({ length: segments }, (_, segment): number[] => {
				const angle = (segment / segments) * Math.PI * 2;
				return [
					point.radius * Math.cos(angle),
					point.height,
					point.radius * Math.sin(angle),
					point.radialNormal * Math.cos(angle),
					point.verticalNormal,
					point.radialNormal * Math.sin(angle),
				];
			}).flat(),
		),
	);
	const indices = new Uint16Array(
		profile.slice(0, -1).flatMap((lower, ring) =>
			Array.from({ length: segments }, (_, segment): number[] => {
				const upper = profile.at(ring + 1);
				const next = (segment + 1) % segments;
				const a = ring * segments + segment,
					b = (ring + 1) * segments + segment,
					c = ring * segments + next,
					d = (ring + 1) * segments + next;
				return lower.radius === 0
					? [a, b, d]
					: upper?.radius === 0
						? [a, b, c]
						: [a, b, c, c, b, d];
			}).flat(),
		),
	);
	return { vertices, indices };
};

export const puckProjection = (aspect: number): Float32Array => {
	const scale = 1 / Math.tan((44 * Math.PI) / 360);
	const near = 0.1,
		far = 20;
	return new Float32Array([
		scale / aspect,
		0,
		0,
		0,
		0,
		scale,
		0,
		0,
		0,
		0,
		(far + near) / (near - far),
		-1,
		0,
		0,
		(2 * far * near) / (near - far),
		0,
	]);
};

export const puckPose = (phase: number): Float32Array => {
	const pitch = Math.sin(phase) * 0.24;
	const roll = Math.sin(phase) * 0.12;
	const yaw = phase;
	const a = Math.cos(pitch),
		b = Math.sin(pitch),
		c = Math.cos(yaw),
		d = Math.sin(yaw),
		e = Math.cos(roll),
		f = Math.sin(roll);
	return new Float32Array([
		e * c - f * b * d,
		f * c + e * b * d,
		-a * d,
		0,
		-f * a,
		e * a,
		b,
		0,
		e * d + f * b * c,
		f * d - e * b * c,
		a * c,
		0,
		0,
		0,
		0,
		1,
	]);
};
