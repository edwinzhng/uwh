import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
	type MemberProfileState,
	useLiveMemberProfile,
	usePreviewMemberProfile,
} from "../backend/use-member-profile";
import { useApp } from "../demo/app-state";
import { ListItem } from "../design-system";
import type { Member } from "../domain/app-types";
import { fitnessDivision } from "../domain/fitness-division";
import { MemberCapNumberEditor } from "./member-cap-number-editor";
import { useSeason } from "./use-season";

const MemberRow = ({
	member,
	state,
}: {
	member: Member;
	state: MemberProfileState;
}): ReactElement => {
	const router = useRouter();
	const { data } = useApp();
	const [seasonId] = useSeason();
	const season = data.seasons.find((entry) => entry.id === seasonId);
	const profile = state.profile;
	const gender =
		profile?.competitionGender ??
		data.playerCoaching?.find((entry) => entry.personId === member.id)?.gender;
	const division = season
		? fitnessDivision(profile?.birthDate, gender, season.start)
		: undefined;
	return (
		<ListItem
			title={member.name}
			avatar={member.name}
			avatarId={member.id}
			description={
				profile?.canEditCapNumber
					? [
							profile.capNumber ? `Cap ${profile.capNumber}` : "No cap number",
							division ?? "Division not set",
						].join(" · ")
					: undefined
			}
			action={
				profile?.canEditCapNumber ? (
					<MemberCapNumberEditor state={state} compactLabel />
				) : undefined
			}
			onPress={(): void =>
				router.push({ pathname: "/member", params: { id: member.id } })
			}
		/>
	);
};
const LiveRow = ({ member }: { member: Member }): ReactElement => (
	<MemberRow member={member} state={useLiveMemberProfile(member)} />
);
const PreviewRow = ({ member }: { member: Member }): ReactElement => (
	<MemberRow member={member} state={usePreviewMemberProfile(member)} />
);
export const MemberRosterRow = ({
	member,
}: {
	member: Member;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveRow member={member} />
	) : (
		<PreviewRow member={member} />
	);
