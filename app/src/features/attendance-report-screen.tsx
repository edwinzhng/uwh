import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Field,
	FilterFields,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";
import { clubPrograms } from "../domain/programs";
import { AttendanceDashboard } from "./attendance-dashboard";
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
	const [programId, setProgram] = useState("");
	const [weekday, setWeekday] = useState("");
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
	return (
		<ClubShell
			title="Attendance"
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
				<Stack gap="md">
					<FilterFields>
						{data.seasons.length > 1 ? (
							<SeasonSelect
								onChange={(): void => {
									setMonth("");
								}}
							/>
						) : undefined}
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
						<Select
							label="Program"
							value={programId || "all"}
							options={[
								{ value: "all", label: "All programs" },
								...clubPrograms(data).map((program) => ({
									value: program.id,
									label: program.name,
								})),
							]}
							onValueChange={(value): void =>
								setProgram(value === "all" ? "" : (value ?? ""))
							}
						/>
						<Select
							label="Day"
							value={weekday || "all"}
							options={[
								{ value: "all", label: "All days" },
								...[
									"Sunday",
									"Monday",
									"Tuesday",
									"Wednesday",
									"Thursday",
									"Friday",
									"Saturday",
								].map((label, day) => ({ value: String(day), label })),
							]}
							onValueChange={(value): void =>
								setWeekday(value === "all" ? "" : (value ?? ""))
							}
						/>
						<Field
							label="Player"
							placeholder="Search players"
							value={search}
							onValueChange={setSearch}
						/>
					</FilterFields>
					<AttendanceDashboard
						seasonId={seasonId}
						month={month || undefined}
						programId={programId || undefined}
						weekday={weekday ? Number(weekday) : undefined}
						search={query}
					/>
				</Stack>
			)}
		</ClubShell>
	);
};
