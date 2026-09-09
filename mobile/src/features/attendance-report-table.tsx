import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { AttendanceMatrix, Button, Row, Stack, Text } from "../design-system";
import { useAttendanceReport } from "./use-attendance-report";

export const AttendanceReportTable = ({
	seasonId,
	month,
	search,
	selected,
	onSelect,
}: {
	seasonId: string;
	month: string;
	search: string;
	selected: string[];
	onSelect: (person: { id: string; name: string }) => void;
}): ReactElement => {
	const { result, page, next, previous } = useAttendanceReport(
		seasonId,
		month,
		search,
	);
	const [columnPage, setColumnPage] = useState(0);
	const router = useRouter();
	const columns = 8;
	const currentColumnPage = Math.min(
		columnPage,
		Math.max(0, Math.ceil((result?.events.length ?? 0) / columns) - 1),
	);
	if (result?.limited)
		return (
			<Text tone="secondary">Choose a month to view this large season.</Text>
		);
	return (
		<Stack>
			{result ? (
				<>
					<Row justify="between" wrap>
						<Text variant="small">
							{result.events.length} completed{" "}
							{result.events.length === 1 ? "practice" : "practices"}
						</Text>
						{result.events.length > columns ? (
							<Row>
								<Button
									label="Earlier"
									variant="ghost"
									isDisabled={currentColumnPage === 0}
									onPress={(): void => setColumnPage(currentColumnPage - 1)}
								/>
								<Text variant="caption">
									{currentColumnPage * columns + 1}–
									{Math.min(
										(currentColumnPage + 1) * columns,
										result.events.length,
									)}
								</Text>
								<Button
									label="Later"
									variant="ghost"
									isDisabled={
										(currentColumnPage + 1) * columns >= result.events.length
									}
									onPress={(): void => setColumnPage(currentColumnPage + 1)}
								/>
							</Row>
						) : undefined}
					</Row>
					{result.page.length ? (
						<AttendanceMatrix
							rows={result.page}
							events={result.events.slice(
								currentColumnPage * columns,
								(currentColumnPage + 1) * columns,
							)}
							selected={selected}
							onSelect={(id): void => {
								const row = result.page.find((row) => row.id === id);
								if (row) onSelect(row);
							}}
							onMember={(id): void =>
								router.push({ pathname: "/member", params: { id } })
							}
							onEvent={(id): void =>
								router.push({
									pathname: "/session",
									params: { event: id, tab: "people" },
								})
							}
						/>
					) : (
						<Text tone="secondary">No players found.</Text>
					)}
				</>
			) : (
				<Text>Loading attendance…</Text>
			)}
			{previous || next ? (
				<Row justify="between">
					<Button
						label="Previous players"
						variant="ghost"
						isDisabled={!previous || !result}
						onPress={previous ?? (() => {})}
					/>
					<Text variant="caption">Page {page}</Text>
					<Button
						label="Next players"
						variant="ghost"
						isDisabled={!next || !result}
						onPress={next ?? (() => {})}
					/>
				</Row>
			) : undefined}
		</Stack>
	);
};
