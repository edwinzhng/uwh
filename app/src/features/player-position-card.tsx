import { type ReactElement, useRef, useState } from "react";
import {
	Avatar,
	Button,
	Checkbox,
	List,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { type Position, positionOptions } from "../domain/player-coaching";
import type { PlayerRanking } from "../domain/player-rankings";
import { useFormTask } from "./use-form-task";

export type SavePlayerPositions = (
	personId: string,
	positions: Position[],
	expectedRevision: number,
) => Promise<void>;
export const PlayerPositionCard = ({
	player,
	save,
	onSaved,
	onBusy,
}: {
	player: PlayerRanking;
	save: SavePlayerPositions;
	onSaved: () => void;
	onBusy: (busy: boolean) => void;
}): ReactElement => {
	const [draft, setDraft] = useState({
		positions: player.positions ?? [],
		revision: player.profileRevision ?? 0,
	});
	const task = useFormTask();
	const advanced = useRef(false);
	const submit = async (): Promise<void> => {
		if (advanced.current) return;
		const success = await task.submit(
			() =>
				draft.positions.length ? undefined : "Choose at least one position.",
			async (): Promise<void> => {
				onBusy(true);
				try {
					await save(player.personId, draft.positions, draft.revision);
				} finally {
					onBusy(false);
				}
			},
		);
		if (success) {
			advanced.current = true;
			onSaved();
		}
	};
	return (
		<Surface>
			<Stack gap="md">
				<Row justify="center">
					<Avatar
						name={player.name}
						personId={player.personId}
						initials
						large
					/>
				</Row>
				<Text variant="h4" align="center">
					{player.name}
				</Text>
				<List>
					{positionOptions.map((option, index) => (
						<Checkbox
							key={option.value}
							label={option.value === "FULL_BACK" ? "Back" : option.label}
							checked={draft.positions.includes(option.value)}
							focusKey={index === 0 ? player.personId : undefined}
							isDisabled={task.busy}
							onChange={(checked): void => {
								setDraft((current) => ({
									...current,
									positions: checked
										? [...current.positions, option.value]
										: current.positions.filter(
												(position) => position !== option.value,
											),
								}));
								task.clear();
							}}
						/>
					))}
				</List>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
				<Button
					label="Continue"
					isLoading={task.busy}
					onPress={(): void => {
						void submit();
					}}
				/>
				{(player.profileRevision ?? 0) !== draft.revision ? (
					<Button
						label="Reload positions"
						variant="ghost"
						onPress={(): void => {
							setDraft({
								positions: player.positions ?? [],
								revision: player.profileRevision ?? 0,
							});
							task.clear();
						}}
					/>
				) : undefined}
			</Stack>
		</Surface>
	);
};
