import type { ReactElement } from "react";
import type { MemberProfileState } from "../backend/use-member-profile";
import { useApp } from "../demo/app-state";
import {
	Avatar,
	Button,
	Grid,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { Member } from "../domain/app-types";
import { programName } from "../domain/programs";
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
	return (
		<Surface header={<Text variant="h4">Profile</Text>}>
			<Stack>
				<Row align="center" justify="between">
					<Stack grow>
						<Row align="center" gap="sm">
							<Avatar name={member.name} uri={photo.uri} />
							<Stack gap="xxs" grow>
								<Text variant="h4">{profile?.name ?? member.name}</Text>
								<Text variant="small" tone="secondary">
									{profile?.capNumber
										? `Cap ${profile.capNumber}`
										: "No cap number"}
								</Text>
							</Stack>
						</Row>
					</Stack>
					<MemberProfileEditor state={state} />
				</Row>
				<Row>
					<MemberProfileEditor state={state} photoOnly />
				</Row>
				{photo.failed ? (
					<Button
						label="Retry profile photo"
						variant="ghost"
						onPress={photo.retry}
					/>
				) : undefined}
				<Grid gap="md">
					<Stack gap="xxs">
						<Text variant="caption" tone="secondary">
							Programs
						</Text>
						<Text>
							{member.programs.map((id) => programName(data, id)).join(" · ") ||
								"No programs assigned"}
						</Text>
					</Stack>
					<Stack gap="xxs">
						<Text variant="caption" tone="secondary">
							Playing position
						</Text>
						<Text>{member.position || "Not set"}</Text>
					</Stack>
				</Grid>
				{profile?.contact ? (
					<Stack gap="sm">
						<Text variant="caption" tone="secondary">
							Private contact details
						</Text>
						<Grid gap="md">
							<Stack gap="xxs">
								<Text variant="caption" tone="secondary">
									Email
								</Text>
								<Text>{profile.contact.email || "Not set"}</Text>
							</Stack>
							<Stack gap="xxs">
								<Text variant="caption" tone="secondary">
									Phone
								</Text>
								<Text>{profile.contact.phone || "Not set"}</Text>
							</Stack>
						</Grid>
					</Stack>
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
