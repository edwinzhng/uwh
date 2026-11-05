import { useLocalSearchParams } from "expo-router";
import { type ReactElement, useState } from "react";
import {
	Button,
	Disclosure,
	List,
	ListItem,
	Progress,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { positionOptions } from "../domain/player-coaching";
import type { PlayerRanking } from "../domain/player-rankings";
import type { SavePlayerPositions } from "./player-position-card";
import { PlayerPositionFlow } from "./player-position-flow";
import type { SaveCoachScore } from "./player-ranking-row";
import { PlayerRatingFlow } from "./player-rating-flow";

export const MatchmakingSections = ({
	players,
	save,
	savePositions,
}: {
	players: PlayerRanking[];
	save: SaveCoachScore;
	savePositions: SavePlayerPositions;
}): ReactElement => {
	const params = useLocalSearchParams<{ player?: string }>();
	const [rating, setRating] = useState<{ personId?: string }>();
	const [position, setPosition] = useState<{ personId?: string }>();
	const rated = players.filter((player) =>
		player.scores.some((score) => score.coachId === player.ownCoachId),
	).length;
	const positioned = players.filter(
		(player) => player.positions?.length,
	).length;
	return (
		<Stack gap="section">
			<Stack gap="heading">
				<SectionHeading>Ratings</SectionHeading>
				<Surface>
					<Stack gap="sm">
						<Row justify="between">
							<Text variant="label">
								{rated} of {players.length} rated
							</Text>
							<Button
								label="Rate players"
								compact
								roleTone="coach"
								isDisabled={!players.length}
								onPress={(): void => setRating({ personId: params.player })}
							/>
						</Row>
						<Progress
							label="Your player ratings"
							value={rated}
							max={players.length}
						/>
						<Disclosure title="All player ratings">
							<List>
								{players.map((player) => (
									<ListItem
										key={player.personId}
										title={player.name}
										avatar={player.name}
										avatarId={player.personId}
										trailing={
											<Text variant="small">
												{player.scores.find(
													(score) => score.coachId === player.ownCoachId,
												)?.score ?? "—"}
											</Text>
										}
										onPress={(): void =>
											setRating({ personId: player.personId })
										}
									/>
								))}
							</List>
						</Disclosure>
					</Stack>
				</Surface>
			</Stack>
			<Stack gap="heading">
				<SectionHeading>Positions</SectionHeading>
				<Surface>
					<Stack gap="sm">
						<Row justify="between">
							<Text variant="label">
								{positioned} of {players.length} assigned
							</Text>
							<Button
								label="Set positions"
								compact
								roleTone="coach"
								isDisabled={positioned === players.length}
								onPress={(): void => setPosition({})}
							/>
						</Row>
						<Progress
							label="Player positions"
							value={positioned}
							max={players.length}
						/>
						<Disclosure title="All player positions">
							<List>
								{players.map((player) => (
									<ListItem
										key={player.personId}
										title={player.name}
										avatar={player.name}
										avatarId={player.personId}
										description={
											player.positions
												?.map((value) =>
													value === "FULL_BACK"
														? "Back"
														: positionOptions.find(
																(option) => option.value === value,
															)?.label,
												)
												.join(" · ") || "Not assigned"
										}
										onPress={(): void =>
											setPosition({ personId: player.personId })
										}
									/>
								))}
							</List>
						</Disclosure>
					</Stack>
				</Surface>
			</Stack>
			{rating ? (
				<PlayerRatingFlow
					players={players}
					initialPersonId={rating.personId}
					save={save}
					onClose={(): void => setRating(undefined)}
				/>
			) : undefined}
			{position ? (
				<PlayerPositionFlow
					players={players}
					initialPersonId={position.personId}
					save={savePositions}
					onClose={(): void => setPosition(undefined)}
				/>
			) : undefined}
		</Stack>
	);
};
