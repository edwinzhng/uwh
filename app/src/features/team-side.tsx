import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Divider,
	List,
	ListItem,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { memberName } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import {
	formationPositions,
	lineupSlotLabel,
	lineupSnapshot,
	lineupTeamPeople,
} from "../domain/lineup";
import {
	type AgeGroup,
	type Position,
	positionLabel,
	positionOptions,
} from "../domain/player-coaching";
import { TeamCaptain } from "./team-captain";
import { TeamStrength } from "./team-strength";

export const TeamSide = ({
	plan,
	side,
	group,
	onCaptainChange,
	onAddPlayer,
}: {
	plan: TeamPlan;
	side: "black" | "white";
	group: AgeGroup | "combined";
	onCaptainChange?: (personId?: string) => void;
	onAddPlayer?: () => void;
}): ReactElement => {
	const { data } = useApp();
	const inGroup = (id: string): boolean =>
		group === "combined" ||
		(plan.assignments?.find((entry) => entry.personId === id)?.ageGroup ??
			"adult") === group;
	const snapshot = lineupSnapshot(plan);
	const players = lineupTeamPeople(snapshot, side).filter(inGroup);
	const formation =
		(side === "black" ? plan.blackFormation : plan.whiteFormation) ?? "2-3-1";
	const captain = plan.captains?.find(
		(entry) => entry.side === side && inGroup(entry.personId),
	);
	const referee = plan.referees?.find((entry) => entry.side === side);
	const positionFor = (id: string): Position =>
		snapshot.positions.find((entry) => entry.personId === id)?.position ??
		"FORWARD";
	return (
		<Surface elevation="raised">
			<Stack>
				<Row justify="between">
					<Text variant="label">{side === "black" ? "Black" : "White"}</Text>
					<Text variant="caption" tone="secondary">
						{players.length} players
					</Text>
				</Row>
				<Text variant="caption" tone="secondary">
					{formation}
				</Text>
				{onAddPlayer ? (
					<Button
						label="Add player"
						prefix="plus"
						variant="secondary"
						onPress={onAddPlayer}
					/>
				) : undefined}
				<Divider />
				<TeamStrength people={players} />
				<TeamCaptain
					side={side}
					people={players}
					personId={captain?.personId}
					onChange={onCaptainChange}
				/>
				{positionOptions
					.filter(
						(option) =>
							formationPositions[formation].some(
								(position) => position === option.value,
							) || players.some((id) => positionFor(id) === option.value),
					)
					.map((option) => {
						const assigned = players.filter(
							(id) => positionFor(id) === option.value,
						);
						return (
							<Stack key={option.value} gap="xxs">
								<Text variant="caption" tone="secondary">
									{positionLabel(option.value, formation)}
								</Text>
								<List>
									{assigned.map((id) => (
										<ListItem
											key={id}
											title={memberName(data, id)}
											avatar={memberName(data, id)}
											avatarId={id}
											description={`${plan.fieldSlots?.find((entry) => entry.personId === id)?.slot !== undefined ? lineupSlotLabel(formation, plan.fieldSlots.find((entry) => entry.personId === id)?.slot ?? 0) : positionLabel(option.value, formation)}${captain?.personId === id ? " · Captain" : ""}`}
										/>
									))}
								</List>
							</Stack>
						);
					})}
				{referee ? (
					<ListItem
						title={memberName(data, referee.personId)}
						avatar={memberName(data, referee.personId)}
						avatarId={referee.personId}
						description="Referee"
					/>
				) : undefined}
			</Stack>
		</Surface>
	);
};
