import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Combobox,
	IconButton,
	Row,
	SectionHeading,
	Select,
	Stack,
	Surface,
} from "../design-system";
import { memberName } from "../domain/app-rules";
import type { TeamPlan } from "../domain/app-types";
import type { LineupEdit, LineupSide, LineupSnapshot } from "../domain/lineup";
import {
	type Position,
	positionLabel,
	positionOptions,
} from "../domain/player-coaching";

type PlayerControls = {
	personId?: string;
	choosePlayer: (id: string | undefined) => void;
	side: LineupSide;
	setSide: (side: LineupSide) => void;
	role: Position;
	setRole: (role: Position) => void;
	swapId?: string;
	setSwapId: (id: string | undefined) => void;
	move: () => Promise<void>;
	swap: () => Promise<void>;
};

export const LineupPlayerTools = ({
	plan,
	snapshot,
	people,
	controls,
	disabled,
	busy,
	onClose,
	stage,
}: {
	plan: TeamPlan;
	snapshot: LineupSnapshot;
	people: string[];
	controls: PlayerControls;
	disabled: boolean;
	busy: boolean;
	onClose: () => void;
	stage: (edit: LineupEdit) => Promise<boolean>;
}): ReactElement => {
	const { data } = useApp();
	const {
		personId,
		choosePlayer,
		side,
		setSide,
		role,
		setRole,
		swapId,
		setSwapId,
		move,
		swap,
	} = controls;
	return (
		<Surface variant="subtle">
			<Stack>
				<SectionHeading
					action={
						<IconButton
							label="Hide player options"
							icon="close"
							onPress={onClose}
							isDisabled={busy}
						/>
					}
				>
					Players & referees
				</SectionHeading>
				{(["black", "white"] as const).map((team) => (
					<Stack key={team} gap="xs">
						<Combobox
							label={`${team === "black" ? "Black" : "White"} referee`}
							value={
								snapshot.referees?.find((entry) => entry.side === team)
									?.personId
							}
							options={data.members
								.filter(
									(member) =>
										!member.archived &&
										!member.mergedInto &&
										member.programs.length > 0,
								)
								.map((member) => ({
									value: member.id,
									label: member.name,
								}))}
							isDisabled={disabled}
							onValueChange={(value): void => {
								void stage({
									kind: "referee",
									side: team,
									personId: value,
								});
							}}
						/>
						{snapshot.referees?.some((entry) => entry.side === team) ? (
							<Button
								label={`Clear ${team} referee`}
								variant="ghost"
								isDisabled={disabled}
								onPress={(): void => {
									void stage({ kind: "referee", side: team });
								}}
							/>
						) : undefined}
					</Stack>
				))}
				<Combobox
					label="Player"
					value={personId}
					options={people.map((id) => ({
						value: id,
						label: memberName(data, id),
					}))}
					isDisabled={disabled}
					onValueChange={choosePlayer}
				/>
				<Select
					label="Team"
					value={side}
					options={[
						{ value: "black", label: "Black" },
						{ value: "white", label: "White" },
					]}
					isDisabled={disabled}
					onValueChange={(value): void => {
						if (value) setSide(value);
					}}
				/>
				<Select
					label="Position"
					value={role}
					options={[
						...positionOptions.map((option) => ({
							...option,
							label: positionLabel(
								option.value,
								side === "black"
									? snapshot.blackFormation
									: snapshot.whiteFormation,
							),
						})),
					]}
					isDisabled={disabled}
					onValueChange={(value): void => {
						if (value) setRole(value);
					}}
				/>
				<Row>
					<Button
						label="Move player"
						variant="secondary"
						isLoading={busy}
						isDisabled={disabled}
						onPress={(): void => {
							void move();
						}}
					/>
				</Row>
				<Combobox
					label="Swap with"
					value={swapId}
					options={people
						.filter(
							(id) =>
								id !== personId &&
								(!plan.separateYouth ||
									plan.assignments?.find((entry) => entry.personId === id)
										?.ageGroup ===
										plan.assignments?.find(
											(entry) => entry.personId === personId,
										)?.ageGroup),
						)
						.map((id) => ({ value: id, label: memberName(data, id) }))}
					isDisabled={disabled}
					onValueChange={setSwapId}
				/>
				<Row>
					<Button
						label="Swap players"
						variant="secondary"
						isLoading={busy}
						isDisabled={disabled}
						onPress={(): void => {
							void swap();
						}}
					/>
				</Row>
			</Stack>
		</Surface>
	);
};
