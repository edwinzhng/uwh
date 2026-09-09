import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	ContentRow,
	IconButton,
	Row,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { memberName } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import {
	type AgeGroup,
	positionLabel,
	positionOptions,
} from "../domain/player-coaching";

export const TeamSide = ({
	plan,
	side,
	group,
	editable,
}: {
	plan: TeamPlan;
	side: "black" | "white";
	group: AgeGroup | "combined";
	editable: boolean;
}): ReactElement => {
	const { data, dispatch, busy } = useApp();
	const players = plan[side].filter(
		(id) =>
			group === "combined" ||
			plan.assignments?.find((entry) => entry.personId === id)?.ageGroup ===
				group,
	);
	const title = side === "black" ? "Black" : "White";
	return (
		<Surface>
			<Stack>
				<Row justify="between">
					<Text variant="label">{title}</Text>
					<Text variant="caption" tone="secondary">
						{players.length} players
					</Text>
				</Row>
				{players.map((id) => {
					const name = memberName(data, id);
					const assignment = plan.assignments?.find(
						(entry) => entry.personId === id,
					);
					return (
						<Stack key={id} gap="xs">
							<ContentRow
								title={name}
								description={
									assignment ? positionLabel(assignment.position) : undefined
								}
								control={
									editable ? (
										<IconButton
											icon="arrowRight"
											label={`Move ${name} to ${side === "black" ? "White" : "Black"}`}
											isDisabled={busy}
											onPress={(): void => {
												void dispatch({
													type: "move-player",
													eventId: plan.eventId,
													personId: id,
												});
											}}
										/>
									) : undefined
								}
							/>
							{editable ? (
								<Select
									label={`${name} · position`}
									value={assignment?.position}
									options={positionOptions}
									isDisabled={busy}
									onValueChange={(position): void => {
										if (position)
											void dispatch({
												type: "assign-position",
												eventId: plan.eventId,
												personId: id,
												position,
											});
									}}
								/>
							) : undefined}
						</Stack>
					);
				})}
			</Stack>
		</Surface>
	);
};
