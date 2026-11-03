import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AttendanceBar } from "../src/design-system/attendance-bar.web";
import {
	attendanceBarPath,
	attendanceChartLabel,
	attendanceChartPoints,
	attendanceSegmentRadius,
	attendanceStackOrder,
	attendanceStackSegments,
	recordedAttendance,
} from "../src/design-system/attendance-plot-model";
import { chartEasing } from "../src/design-system/chart-animation";
import { corners, motion } from "../src/design-system/tokens";

test("attendance plot excludes unrecorded counts and unknown-only months without changing recorded results", (): void => {
	const input = [
		{ label: "Sep", onTime: 2, late: 1, absent: 1, unmarked: 100 },
		{ label: "Oct", onTime: 0, late: 0, absent: 0, unmarked: 200 },
	];
	const points = attendanceChartPoints(input);
	expect(points).toEqual([{ label: "Sep", onTime: 2, late: 1, absent: 1 }]);
	expect(points.map(recordedAttendance)).toEqual([4]);
	expect(input.at(0)?.unmarked).toBe(100);
	expect(input.at(1)?.unmarked).toBe(200);
	expect(attendanceChartLabel(points)).toBe(
		"Sep: 2 on time, 1 late, 1 no-show",
	);
	const unknown = input.at(1);
	if (!unknown) throw new Error("Unknown month fixture missing");
	expect(attendanceChartLabel(attendanceChartPoints([unknown]))).toBe(
		"No recorded attendance",
	);
});

test("only the exposed top category is rounded for every nonzero stack topology", (): void => {
	for (const mask of Array.from({ length: 8 }, (_, index) => index)) {
		const point = {
			label: String(mask),
			onTime: mask & 1 ? 4 : 0,
			late: mask & 2 ? 4 : 0,
			absent: mask & 4 ? 4 : 0,
		};
		const top = attendanceStackOrder.findLast((segment) => point[segment] > 0);
		const segments = attendanceStackSegments(point, 12, 120, 40);
		expect(
			segments
				.filter((segment) => segment.radius > 0)
				.map((segment) => segment.key),
		).toEqual(top ? [top] : []);
		for (const segment of segments) {
			expect(segment.radius).toBe(segment.key === top ? corners.item : 0);
			const markup = renderToStaticMarkup(
				createElement(AttendanceBar, {
					point,
					segment: segment.key,
					x: 10,
					y: segment.y,
					width: 40,
					height: segment.height,
				}),
			);
			expect(markup).toContain(
				`d="${attendanceBarPath(10, segment.y, 40, segment.height, segment.radius)}"`,
			);
			if (segment.height > 0 && segment.key === top) {
				expect(markup.match(/ Q /gu)).toHaveLength(2);
				expect(markup).toContain(`V ${segment.y + segment.height} Z`);
			} else expect(markup).not.toContain(" Q ");
		}
	}
});

test("a thin exposed segment cannot round the segment below or the stack baseline", (): void => {
	const point = { label: "Sep", onTime: 50, late: 49, absent: 1 };
	const segments = attendanceStackSegments(point, 100, 100, 40);
	expect(segments).toEqual([
		{ key: "onTime", y: 50, height: 50, radius: 0 },
		{ key: "late", y: 1, height: 49, radius: 0 },
		{ key: "absent", y: 0, height: 1, radius: 0.5 },
	]);
	expect(attendanceSegmentRadius(point, "absent", 0.5, 1)).toBe(0.25);
	expect(
		attendanceStackSegments(point, 0, 100, 40).every(
			(segment) => segment.radius === 0 && segment.height === 0,
		),
	).toBe(true);
	expect(attendanceBarPath(0, 0, 40, 0, 0)).toBe("");
	expect(attendanceBarPath(0, 0, 40, 10, 0)).toBe("M 0 0 H 40 V 10 H 0 Z");
});

test("chart animation uses the shared out easing rather than the library default", (): void => {
	expect(String(chartEasing)).toBe(
		`cubic-bezier(${motion.easing.out.join(",")})`,
	);
});
