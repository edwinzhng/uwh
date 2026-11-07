import { useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { SegmentedControl, Stack, Text } from "../design-system";
import { formatFitnessValue } from "../domain/fitness";

type Scope = "overall" | "division";
const options: { value: Scope; label: string }[] = [
	{ value: "overall", label: "Overall" },
	{ value: "division", label: "My Division" },
];

const LiveCompetition = ({
	personId,
	seasonId,
}: {
	personId: string;
	seasonId: string;
}): ReactElement => {
	const [scope, setScope] = useState<Scope>("overall");
	const result = useQuery(api.fitness.competition, { personId, seasonId });
	return (
		<Stack gap="xs">
			<SegmentedControl
				label="Fitness comparison"
				hideLabel
				value={scope}
				options={options}
				onValueChange={setScope}
			/>
			{!result ? (
				<Text tone="secondary" variant="small">
					Loading fitness standings…
				</Text>
			) : scope === "division" && !result.division ? (
				<Text tone="secondary" variant="small">
					Add your date of birth and gender in your profile to see your
					division.
				</Text>
			) : !result.rows.length ? (
				<Text tone="secondary" variant="small">
					No fitness results yet.
				</Text>
			) : (
				<Stack gap="xs">
					{scope === "division" ? (
						<Text variant="caption" tone="secondary">
							{result.division}
						</Text>
					) : undefined}
					{result.rows.map((row) => {
						const best =
							scope === "overall" ? row.overallBest : row.divisionBest;
						const rank =
							scope === "overall" ? row.overallRank : row.divisionRank;
						return (
							<Stack key={row.testId} gap="none">
								<Text variant="small" weight="semibold">
									{row.name}
								</Text>
								<Text variant="caption" tone="secondary">
									{best === undefined
										? "No division results yet"
										: `All-time best ${formatFitnessValue(row.unit, best)}${row.unit === "distance" ? " m" : ""}`}
									{row.personalBest !== undefined
										? ` · You ${formatFitnessValue(row.unit, row.personalBest)}${row.unit === "distance" ? " m" : ""}${rank ? ` · #${rank}` : ""}`
										: " · No personal result"}
								</Text>
							</Stack>
						);
					})}
				</Stack>
			)}
		</Stack>
	);
};

export const FitnessCompetition = ({
	personId,
	seasonId,
}: {
	personId: string;
	seasonId: string;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveCompetition personId={personId} seasonId={seasonId} />
	) : (
		<Text variant="small" tone="secondary">
			Fitness standings are available when connected.
		</Text>
	);
