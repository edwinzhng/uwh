import { type ReactElement, useState } from "react";
import { Button, Dialog, EmptyState, Stack, Text } from "../design-system";
import type { PlayerRanking } from "../domain/player-rankings";
import { positionFlowIndex, positionFlowQueue } from "../domain/position-flow";
import {
	PlayerPositionCard,
	type SavePlayerPositions,
} from "./player-position-card";

export const PlayerPositionFlow = ({
	players,
	initialPersonId,
	save,
	onClose,
}: {
	players: PlayerRanking[];
	initialPersonId?: string;
	save: SavePlayerPositions;
	onClose: () => void;
}): ReactElement => {
	const [queue] = useState(() => positionFlowQueue(players, initialPersonId));
	const [cursor, setCursor] = useState(0);
	const [busy, setBusy] = useState(false);
	const index = positionFlowIndex(queue, players, cursor);
	const id = queue.at(index);
	const player = players.find((entry) => entry.personId === id);
	return (
		<Dialog
			title="Set positions"
			intent="form"
			isOpen
			isDismissDisabled={busy}
			onOpenChange={(open): void => {
				if (!open && !busy) onClose();
			}}
			footer={!player ? <Button label="Done" onPress={onClose} /> : undefined}
		>
			<Stack>
				<Text variant="caption" tone="secondary">
					{cursor} of {queue.length} saved
				</Text>
				{player ? (
					<PlayerPositionCard
						key={player.personId}
						player={player}
						save={save}
						onBusy={setBusy}
						onSaved={(): void => setCursor(index + 1)}
					/>
				) : (
					<EmptyState title="Positions complete" />
				)}
			</Stack>
		</Dialog>
	);
};
