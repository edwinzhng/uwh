import type { ReactElement } from "react";
import type { MemberProfileState } from "../backend/use-member-profile";
import { useApp } from "../demo/app-state";
import { Avatar, Button, Row, Stack, Surface, Text } from "../design-system";
import type { Member } from "../domain/app-types";
import { programName } from "../domain/programs";
import { MemberCapNumberEditor } from "./member-cap-number-editor";
import { MemberProfileEditor } from "./member-profile-editor";
import { usePhotoUri } from "./use-photo-uri";

export const MemberProfileCard = ({
	member,
	state,
}: {
	member: Member;
	state: MemberProfileState;
}): ReactElement => {
	const profile = state.profile;
	const { data } = useApp();
	const photo = usePhotoUri(profile?.photoId, state.photos);
	const detail = [
		profile?.capNumber ? `Cap ${profile.capNumber}` : undefined,
		...member.programs.map((id) => programName(data, id)),
		member.position,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<Surface>
			<Stack gap="sm">
				<Row gap="sm">
					<Avatar name={member.name} personId={member.id} uri={photo.uri} />
					<Stack grow gap="xxs">
						<Text variant="h4">{profile?.name ?? member.name}</Text>
						{detail ? (
							<Text variant="small" tone="secondary">
								{detail}
							</Text>
						) : undefined}
					</Stack>
				</Row>
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
			</Stack>
		</Surface>
	);
};
