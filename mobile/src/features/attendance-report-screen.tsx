import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Field, Row, Select, Stack, Text } from "../design-system";
import { AttendanceComparison } from "./attendance-comparison";
import { AttendanceReportTable } from "./attendance-report-table";
import { ClubShell } from "./club-shell";
import { SeasonSelect } from "./season-select";
import { useSearchTerm } from "./use-search-term";
import { useSeason } from "./use-season";

export const AttendanceReportScreen = (): ReactElement => {
	const { account, source, data } = useApp();
	const router = useRouter();
	const [seasonId] = useSeason();
	const [search, setSearch] = useState("");
	const query = useSearchTerm(search);
	const [month, setMonth] = useState("");
	const [selected, setSelected] = useState<{ id: string; name: string }[]>([]);
	const season = data.seasons.find((entry) => entry.id === seasonId);
	const years = season
		? Array.from(
				{
					length: Math.min(
						10,
						Number(season.end.slice(0, 4)) -
							Number(season.start.slice(0, 4)) +
							1,
					),
				},
				(_, index) => Number(season.start.slice(0, 4)) + index,
			)
		: [];
	const months = years
		.flatMap((year) =>
			Array.from(
				{ length: 12 },
				(_, index) => `${year}-${String(index + 1).padStart(2, "0")}`,
			),
		)
		.filter(
			(value) =>
				season &&
				value >= season.start.slice(0, 7) &&
				value <= season.end.slice(0, 7),
		);
	const toggle = (person: { id: string; name: string }): void =>
		setSelected((current) =>
			current.some((entry) => entry.id === person.id)
				? current.filter((entry) => entry.id !== person.id)
				: current.length < 4
					? [...current, person]
					: current,
		);
	return (
		<ClubShell
			title="Attendance"
			staffRole={account.coachPrograms.length ? "coach" : undefined}
			back={
				<Row>
					<Button
						label="Club"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/club")}
					/>
				</Row>
			}
		>
			{!account.coachPrograms.length ? (
				<Text>Coach access required.</Text>
			) : source !== "convex" ? (
				<Text>Connect to your club to view reports.</Text>
			) : (
				<Stack gap="lg">
					<Row wrap>
						<SeasonSelect
							onChange={(): void => {
								setMonth("");
								setSelected([]);
							}}
						/>
						<Select
							label="Period"
							value={month || "season"}
							options={[
								{ value: "season", label: "Whole season" },
								...months.map((value) => ({
									value,
									label: new Intl.DateTimeFormat("en", {
										month: "short",
										year: "numeric",
										timeZone: "UTC",
									}).format(new Date(`${value}-01T12:00:00Z`)),
								})),
							]}
							onValueChange={(value): void =>
								setMonth(value === "season" ? "" : (value ?? ""))
							}
						/>
						<Field
							label="Player"
							placeholder="Search players"
							value={search}
							onValueChange={setSearch}
						/>
					</Row>
					<AttendanceReportTable
						key={`${seasonId}:${month}:${query}`}
						seasonId={seasonId}
						month={month}
						search={query}
						selected={selected.map((person) => person.id)}
						onSelect={toggle}
					/>
					<AttendanceComparison
						seasonId={seasonId}
						month={month}
						people={selected}
						onRemove={(id): void =>
							setSelected((current) =>
								current.filter((person) => person.id !== id),
							)
						}
					/>
				</Stack>
			)}
		</ClubShell>
	);
};
