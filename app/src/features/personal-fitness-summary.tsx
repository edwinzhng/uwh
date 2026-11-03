import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import {
	Dialog,
	Icon,
	List,
	ListItem,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatFitnessValue } from "../domain/fitness";
import {
	fitnessChange,
	type PersonalFitnessRow,
} from "../domain/personal-fitness";
import { FitnessChangeIndicator } from "./fitness-change-indicator";
import { PersonalFitnessDetail } from "./personal-fitness-detail";

export const PersonalFitnessSummary = ({
	rows,
	personId,
	full = false,
}: {
	rows: PersonalFitnessRow[];
	personId: string;
	full?: boolean;
}): ReactElement => {
	const router = useRouter();
	const [selectedId, setSelectedId] = useState<string>();
	const selected = rows.find((row) => row.test._id === selectedId);
	return (
		<>
			<Surface padding="xs">
				<List>
					{(full ? rows : rows.slice(0, 2)).map((row) => {
						const format = (value?: number): string =>
							`${formatFitnessValue(row.test.unit, value)}${row.test.unit === "distance" && value !== undefined ? " m" : ""}`;
						const change = fitnessChange(row);
						return (
							<ListItem
								key={row.test._id}
								title={row.test.name}
								accessibilityLabel={[
									row.test.name,
									`Latest ${format(row.history.at(0)?.value)}`,
									`Personal best ${format(row.stats?.best)}`,
									change
										? change.direction === "equal"
											? "Unchanged"
											: `${change.value} ${change.improved ? "improvement" : "regression"}`
										: undefined,
									"View history and trend",
								]
									.filter(Boolean)
									.join(". ")}
								titleLines={2}
								descriptionLines={2}
								description={`Best ${format(row.stats?.best)}`}
								trailing={
									<Row gap="sm">
										<Stack gap="none">
											<Row justify="end">
												<Text variant="label">
													{format(row.history.at(0)?.value)}
												</Text>
											</Row>
											<Row justify="end">
												<FitnessChangeIndicator row={row} />
											</Row>
										</Stack>
										<Icon name="chevron" size="sm" tone="secondary" />
									</Row>
								}
								onPress={(): void => {
									if (full) {
										setSelectedId(row.test._id);
										return;
									}
									router.push({
										pathname: "/fitness",
										params: { person: personId },
									});
								}}
							/>
						);
					})}
				</List>
			</Surface>
			{selected ? (
				<Dialog
					title={selected.test.name}
					isOpen
					onOpenChange={(open): void => {
						if (!open) setSelectedId(undefined);
					}}
					footer={false}
				>
					<PersonalFitnessDetail row={selected} />
				</Dialog>
			) : undefined}
		</>
	);
};
