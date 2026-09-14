import { type ReactElement, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import type { AttendanceReportRow } from "../domain/attendance-report";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

type Props = {
	rows: AttendanceReportRow[];
	onMember: (id: string) => void;
};

type SortKey = "name" | "attended" | "onTime" | "recorded";
type SortDirection = "asc" | "desc";

const percent = (value?: number): string =>
	value === undefined ? "N/A" : `${value}%`;

export const AttendanceMatrix = ({ rows, onMember }: Props): ReactElement => {
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const [sortKey, setSortKey] = useState<SortKey>("attended");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const contentWidth = Math.max(
		560,
		width >= geometry.wide
			? width - geometry.popupWidth - space.lg * 2
			: width - space.md * 2,
	);
	const columns: Array<{ key: SortKey; label: string }> = [
		{ key: "name", label: "Player" },
		{ key: "attended", label: "Attendance" },
		{ key: "onTime", label: "On time" },
		{ key: "recorded", label: "Recorded" },
	];
	const sortNumber = (
		left: number | undefined,
		right: number | undefined,
		direction: SortDirection,
	): number => {
		if (left === undefined && right === undefined) return 0;
		if (left === undefined) return 1;
		if (right === undefined) return -1;
		return (left - right) * (direction === "asc" ? 1 : -1);
	};
	const sortedRows = [...rows].sort((left, right) => {
		const primary =
			sortKey === "name"
				? left.name.localeCompare(right.name) *
					(sortDirection === "asc" ? 1 : -1)
				: sortNumber(left[sortKey], right[sortKey], sortDirection);
		if (primary !== 0) return primary;
		if (sortKey === "attended") {
			const onTime = sortNumber(left.onTime, right.onTime, "desc");
			if (onTime !== 0) return onTime;
			const recorded = sortNumber(left.recorded, right.recorded, "desc");
			if (recorded !== 0) return recorded;
		}
		return left.name.localeCompare(right.name);
	});
	const changeSort = (key: SortKey): void => {
		if (key === sortKey) {
			setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
			return;
		}
		setSortKey(key);
		setSortDirection(key === "name" ? "asc" : "desc");
	};
	return (
		<ScrollView
			horizontal
			accessibilityLabel="Attendance records"
			style={{
				borderWidth: geometry.border,
				borderColor: theme.border,
				borderRadius: corners.panel,
			}}
		>
			<View style={{ width: contentWidth }}>
				<View
					style={{
						flexDirection: "row",
						backgroundColor: theme.background.secondary,
						paddingVertical: space.xs,
					}}
				>
					{columns.map(({ key, label }, index) => (
						<View
							key={key}
							style={{ flex: index === 0 ? 2 : 1, paddingHorizontal: space.sm }}
						>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={`Sort by ${label}`}
								onPress={(): void => changeSort(key)}
								style={{ minHeight: space.lg, justifyContent: "center" }}
							>
								<Text variant="caption" tone="secondary">
									{label}
									{sortKey === key
										? sortDirection === "asc"
											? " ↑"
											: " ↓"
										: ""}
								</Text>
							</Pressable>
						</View>
					))}
				</View>
				{sortedRows.map((row) => (
					<View
						key={row.id}
						style={{
							flexDirection: "row",
							alignItems: "center",
							borderTopWidth: geometry.border,
							borderColor: theme.border,
							paddingVertical: space.xxs,
						}}
					>
						<View style={{ flex: 2, paddingHorizontal: space.xs }}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={row.name}
								onPress={(): void => onMember(row.id)}
								style={{ minHeight: space.xl, justifyContent: "center" }}
							>
								<Text variant="small">{row.name}</Text>
							</Pressable>
						</View>
						<View style={{ flex: 1, paddingHorizontal: space.sm }}>
							<Text variant="small">{percent(row.attended)}</Text>
						</View>
						<View style={{ flex: 1, paddingHorizontal: space.sm }}>
							<Text variant="small">{percent(row.onTime)}</Text>
						</View>
						<View style={{ flex: 1, paddingHorizontal: space.sm }}>
							<Text variant="small">
								{row.recorded}/{row.total}
							</Text>
						</View>
					</View>
				))}
			</View>
		</ScrollView>
	);
};
