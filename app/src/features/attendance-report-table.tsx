import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
	AttendanceMatrix,
	Button,
	EmptyState,
	LoadingContent,
	Row,
	Stack,
	Text,
} from "../design-system";
import { useAttendanceReport } from "./use-attendance-report";

export const AttendanceReportTable = ({
	seasonId,
	month,
	search,
}: {
	seasonId: string;
	month: string;
	search: string;
}): ReactElement => {
	const { result, page, next, previous } = useAttendanceReport(
		seasonId,
		month,
		search,
	);
	const router = useRouter();
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
					</Row>
					{result.page.length ? (
						<AttendanceMatrix
							rows={result.page}
							onMember={(id): void =>
								router.push({ pathname: "/member", params: { id } })
							}
						/>
					) : (
						<EmptyState
							title="No players found"
							description="Try changing your filters."
						/>
					)}
				</>
			) : (
				<LoadingContent />
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
