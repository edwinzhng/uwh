import { type ReactElement, useState } from "react";
import type { PlayerCoachingState } from "../backend/use-player-coaching";
import {
	Button,
	Grid,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { positionLabel } from "../domain/player-coaching";
import { PlayerCoachingForm } from "./player-coaching-form";

export const PlayerCoachingDetails = (
	state: PlayerCoachingState,
): ReactElement => {
	const [editing, setEditing] = useState(false);
	const profile = state.profile;
	return (
		<Surface
			header={
				<SectionHeading
					action={
						<Button
							label="Edit"
							variant="secondary"
							isDisabled={!profile}
							onPress={(): void => setEditing(true)}
						/>
					}
				>
					Player details
				</SectionHeading>
			}
		>
			<Stack gap="md">
				{profile ? (
					<Grid gap="md">
						<Stack gap="xxs">
							<Text variant="small" tone="secondary">
								Age group
							</Text>
							<Text>{profile.ageGroup === "adult" ? "Adult" : "Youth"}</Text>
						</Stack>
						<Stack gap="xxs">
							<Text variant="small" tone="secondary">
								Rating
							</Text>
							<Text>{profile.rating}</Text>
						</Stack>
						<Stack gap="xxs">
							<Text variant="small" tone="secondary">
								Positions
							</Text>
							<Text>
								{profile.positions.map(positionLabel).join(" · ") ||
									"Any position"}
							</Text>
						</Stack>
					</Grid>
				) : (
					<Text variant="small" tone="secondary">
						Loading…
					</Text>
				)}

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
		</Surface>
	);
};
