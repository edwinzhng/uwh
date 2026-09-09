import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Divider,
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
		<Surface elevation="raised">
			<Stack>
				<Row justify="between">
					<Text variant="label">{title}</Text>
					<Text variant="caption" tone="secondary">
						{players.length} players
					</Text>
				</Row>
				<Divider />
				<Stack gap="sm">
					{players.map((id) => {
						const name = memberName(data, id);
						const assignment = plan.assignments?.find(
							(entry) => entry.personId === id,
						);
						return (
							<Row key={id} gap="xs">
								<Stack gap="xxs" grow>
									<Text variant="small">{name}</Text>
									{editable ? (
										<Select
											hideLabel
											compact
											label={`${name} · position`}
											value={assignment?.position}
											options={positionOptions}
											isDisabled={busy}
											onValueChange={(position): void => {
												if (position)
													void dispatch({
														type: "assign-position",
														eventId: plan.eventId,
														partId: plan.partId,
														personId: id,
														position,
													});
											}}
										/>
									) : undefined}
									{!editable && assignment ? (
										<Text variant="caption" tone="secondary">
											{positionLabel(assignment.position)}
										</Text>
									) : undefined}
								</Stack>
								{editable ? (
									<IconButton
										icon={side === "black" ? "arrowRight" : "arrowLeft"}
										label={`Move ${name} to ${side === "black" ? "White" : "Black"}`}
										isDisabled={busy}
										onPress={(): void => {
											void dispatch({
												type: "move-player",
												eventId: plan.eventId,
												partId: plan.partId,
												personId: id,
											});
										}}
									/>
								) : undefined}
							</Row>
						);
					})}
				</Stack>
			</Stack>
		</Surface>
	);
};
