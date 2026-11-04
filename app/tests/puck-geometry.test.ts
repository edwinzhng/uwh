import { expect, test } from "bun:test";
import {
	createPuckGeometry,
	puckPose,
	puckProjection,
} from "../src/design-system/puck-geometry";

type Vector = readonly [number, number, number];
const subtract = (a: Vector, b: Vector): Vector => [
	a[0] - b[0],
	a[1] - b[1],
	a[2] - b[2],
];
const cross = (a: Vector, b: Vector): Vector => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vector, b: Vector): number =>
	a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vectorAt = (values: Float32Array, offset: number): Vector => [
	values.at(offset) ?? 0,
	values.at(offset + 1) ?? 0,
	values.at(offset + 2) ?? 0,
];
const key = (point: Vector): string =>
	point
		.map((value): string => value.toFixed(5).replace("-0.00000", "0.00000"))
		.join(",");

test("puck is closed, nondegenerate and outward facing for transmission passes", (): void => {
	const { vertices, indices } = createPuckGeometry();
	const count = vertices.length / 6;
	const edges = new Map<string, number>();
	expect(Math.max(...indices)).toBeLessThan(count);
	for (const index of Array.from(
		{ length: indices.length / 3 },
		(_, triangle): number => triangle * 3,
	)) {
		const a = vectorAt(vertices, (indices.at(index) ?? 0) * 6);
		const b = vectorAt(vertices, (indices.at(index + 1) ?? 0) * 6);
		const c = vectorAt(vertices, (indices.at(index + 2) ?? 0) * 6);
		const normal = cross(subtract(b, a), subtract(c, a));
		expect(dot(normal, normal)).toBeGreaterThan(0.00000001);
		expect(dot(normal, a)).toBeGreaterThan(0);
		for (const pair of [
			[a, b],
			[b, c],
			[c, a],
		]) {
			const edge = pair.map(key).sort().join("/");
			edges.set(edge, (edges.get(edge) ?? 0) + 1);
		}
	}
	expect(Array.from(edges.values()).every((uses): boolean => uses === 2)).toBe(
		true,
	);
	for (const index of Array.from(
		{ length: count },
		(_, vertex): number => vertex * 6,
	)) {
		const normal = vectorAt(vertices, index + 3);
		expect(dot(normal, normal)).toBeCloseTo(1, 5);
		const position = vectorAt(vertices, index);
		expect(Math.hypot(position[0], position[2])).toBeLessThanOrEqual(0.940001);
		expect(Math.abs(position[1])).toBeLessThanOrEqual(0.25);
	}
});

test("wobble preserves shape and loops without a pose discontinuity", (): void => {
	for (const phase of [0, 0.5, 1.5, 3, 5, Math.PI * 2]) {
		const matrix = puckPose(phase);
		const x = vectorAt(matrix, 0),
			y = vectorAt(matrix, 4),
			z = vectorAt(matrix, 8);
		expect(dot(x, x)).toBeCloseTo(1, 5);
		expect(dot(y, y)).toBeCloseTo(1, 5);
		expect(dot(z, z)).toBeCloseTo(1, 5);
		expect(dot(x, y)).toBeCloseTo(0, 5);
		expect(dot(x, z)).toBeCloseTo(0, 5);
		expect(dot(y, z)).toBeCloseTo(0, 5);
		expect(dot(cross(x, y), z)).toBeCloseTo(1, 5);
	}
	const start = puckPose(0),
		end = puckPose(Math.PI * 2);
	start.forEach((value, index): void => {
		expect(value).toBeCloseTo(end.at(index) ?? 0, 5);
	});
	expect(puckProjection(2).at(0)).toBeCloseTo(
		(puckProjection(1).at(0) ?? 0) / 2,
		5,
	);
});

test("the first puck pose has a slight tilt without moving its center", (): void => {
	const matrix = puckPose(0);
	const normal = vectorAt(matrix, 4);
	const tilt = Math.acos(normal[1]);
	expect(tilt).toBeGreaterThan(0.05);
	expect(tilt).toBeLessThan(0.3);
	expect(vectorAt(matrix, 12)).toEqual([0, 0, 0]);
});
