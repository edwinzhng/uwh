import { type ReactElement, useState } from "react";
import type { PlayerCoachingState } from "../backend/use-player-coaching";
import { Button, ContentRow, Stack, Text } from "../design-system";
import { positionLabel } from "../domain/player-coaching";
import { PlayerCoachingForm } from "./player-coaching-form";

export const PlayerCoachingDetails = (
	state: PlayerCoachingState,
): ReactElement => {
	const [editing, setEditing] = useState(false);
	const profile = state.profile;
	return (
		<Stack>
			<ContentRow
				title="Player details"
				description={
					profile
						? `${profile.ageGroup === "adult" ? "Adult" : "Youth"} · Rating ${profile.rating}`
						: "Loading…"
				}
				control={
					<Button
						label="Edit"
						variant="secondary"
						isDisabled={!profile}
						onPress={(): void => setEditing(true)}
					/>
				}
			/>
			{profile ? (
				<Text variant="small" tone="secondary">
					{profile.positions.map(positionLabel).join(" · ") || "Any position"}
				</Text>
			) : undefined}
			{editing && profile ? (
				<PlayerCoachingForm
					busy={state.busy}
					error={state.error}
					save={state.save}
					profile={profile}
					onClose={(): void => setEditing(false)}
				/>
			) : undefined}
		</Stack>
	);
};
