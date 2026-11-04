import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Icon, List, ListItem, Row, Stack, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import { formatFitnessValue } from "../domain/fitness";
import type { PersonalFitnessRow } from "../domain/personal-fitness";
import { DataPage } from "./data-page";

export const PersonalFitnessHistory = ({
	row,
	personId,
}: {
	row: PersonalFitnessRow;
	personId: string;
}): ReactElement => (
	<Stack gap="sm">
		<Text variant="h4">
			Result history · {row.stats?.count ?? row.history.length}
		</Text>
		<Row justify="between">
			<Text variant="label" tone="secondary">
				Date
			</Text>
			<Text variant="label" tone="secondary">
				Result
			</Text>
		</Row>
		<DataPage
			config={{
				query: api.fitness.personalHistory,
				args: { testId: row.test._id as Id<"fitnessTests">, personId },
				preview: row.history,
				size: 25,
			}}
		>
			{(items) => (
				<List>
					{items.map((entry) => (
						<ListItem
							key={entry.sessionId}
							title={formatDate(entry.date)}
							description={entry.notes || undefined}
							trailing={
								<Row gap="xs">
									{row.test.unit !== "pass_fail" &&
									entry.value === row.stats?.best ? (
										<Icon name="star" tone="success" />
									) : undefined}
									<Text variant="label">
										{formatFitnessValue(row.test.unit, entry.value)}
										{row.test.unit === "distance" ? " m" : ""}
									</Text>
								</Row>
							}
						/>
					))}
				</List>
			)}
		</DataPage>
	</Stack>
);
