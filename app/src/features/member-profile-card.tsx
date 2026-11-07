import type { ReactElement } from "react";
import type { MemberProfileState } from "../backend/use-member-profile";
import { useApp } from "../demo/app-state";
import { Avatar, Button, Row, Stack, Surface, Text } from "../design-system";
import type { Member } from "../domain/app-types";
import { fitnessDivision } from "../domain/fitness-division";
import { positionPreferenceLabel } from "../domain/position-preferences";
import { ContentReport } from "./content-report";
import { MemberCapNumberEditor } from "./member-cap-number-editor";
import { MemberProfileEditor } from "./member-profile-editor";
import { usePhotoUri } from "./use-photo-uri";
import { useSeason } from "./use-season";

export const MemberProfileCard = ({
	member,
	state,
}: {
	member: Member;
	state: MemberProfileState;
}): ReactElement => {
	const profile = state.profile;
	const { data } = useApp();
	const [seasonId] = useSeason();
	const season = data.seasons.find((entry) => entry.id === seasonId);
	const division = season
		? fitnessDivision(
				profile?.birthDate,
				profile?.competitionGender,
				season.start,
			)
		: undefined;
	const photo = usePhotoUri(profile?.photoId, state.photos);
	const primaryPosition = profile?.positionPreferences?.at(0);
	return (
		<Surface>
			<Stack gap="sm">
				<Row gap="sm" align="start">
					<Avatar
						name={member.name}
						personId={member.id}
						uri={photo.uri}
						large
					/>
					<Stack grow gap="xxs">
						<Text variant="h4">{profile?.name ?? member.name}</Text>
					</Stack>
					<Stack gap="xxs">
						<Text variant="small" weight="semibold">
							{profile?.capNumber === undefined
								? "Cap # —"
								: `Cap #${profile.capNumber}`}
						</Text>
						<Text
							variant="caption"
							tone="secondary"
						>{`Player position: ${primaryPosition ? positionPreferenceLabel(primaryPosition) : "Not set"}`}</Text>
					</Stack>
				</Row>
				{profile?.canEdit || profile?.canEditCapNumber ? (
					<Text
						variant="small"
						tone="secondary"
					>{`Division: ${division ?? "Not set"}`}</Text>
				) : undefined}
				{profile?.canEdit || profile?.canEditCapNumber ? (
					<Row wrap gap="xs">
						<MemberProfileEditor state={state} />
						<MemberCapNumberEditor state={state} />
					</Row>
				) : undefined}
				{profile?.contact?.phone ? (
					<Text
						variant="caption"
						tone="secondary"
						accessibilityLabel={`Private phone: ${profile.contact.phone}`}
					>
						{profile.contact.phone}
					</Text>
				) : undefined}
				{photo.failed ? (
					<Button
						label="Retry profile photo"
						variant="ghost"
						compact
						onPress={photo.retry}
					/>
				) : undefined}
				{state.loading ? (
					<Text variant="caption" tone="secondary">
						Loading profile…
					</Text>
				) : undefined}
				<ContentReport
					source={{ kind: "profile", id: member.id }}
					label="Report profile"
				/>
			</Stack>
		</Surface>
	);
};
