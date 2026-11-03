import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import type { PlayerCoachingState } from "../backend/use-player-coaching";
import {
	Button,
	Grid,
	LoadingContent,
	Row,
	SectionHeading,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import {
	coachingGenderOptions,
	playerRatingLabel,
	positionLabel,
} from "../domain/player-coaching";
import { PlayerCoachingForm } from "./player-coaching-form";

export const PlayerCoachingDetails = (
	state: PlayerCoachingState,
): ReactElement => {
	const [editing, setEditing] = useState(false);
	const router = useRouter();
	const profile = state.profile;
	return (
		<Surface
			header={
				<SectionHeading
					action={
						<Row wrap>
							<Button
								label="Score player"
								variant="secondary"
								isDisabled={!profile}
								onPress={(): void => {
									if (profile)
										router.push({
											pathname: "/members",
											params: { tab: "rankings", player: profile.personId },
										});
								}}
							/>
							<Button
								label="Edit details"
								variant="secondary"
								isDisabled={!profile}
								onPress={(): void => setEditing(true)}
							/>
						</Row>
					}
				>
					Player details
				</SectionHeading>
			}
		>
			<Stack gap="md">
				{state.error && !editing ? (
					<Text tone="danger" variant="small">
						{state.error}
					</Text>
				) : undefined}
				{profile ? (
					<Grid gap="md">
						<Select
							label="Gender · coaching only"
							value={profile.gender ?? "unspecified"}
							options={coachingGenderOptions}
							isDisabled={state.busy}
							onValueChange={(value): void => {
								void state.save({
									...profile,
									gender: value === "unspecified" ? undefined : value,
								});
							}}
						/>
						<Stack gap="xxs">
							<Text variant="caption" tone="secondary">
								Age group
							</Text>
							<Text>{profile.ageGroup === "adult" ? "Adult" : "Youth"}</Text>
						</Stack>
						<Stack gap="xxs">
							<Text variant="caption" tone="secondary">
								Rating
							</Text>
							<Text>{playerRatingLabel(profile)}</Text>
						</Stack>
						<Stack gap="xxs">
							<Text variant="caption" tone="secondary">
								Positions
							</Text>
							<Text>
								{profile.positions
									.map((position) => positionLabel(position))
									.join(" · ") || "Any position"}
							</Text>
						</Stack>
					</Grid>
				) : (
					<LoadingContent />
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
