import type { ReactElement } from "react";
import { useActivePerson } from "../demo/app-state";
import { ClubShell } from "./club-shell";
import { MemberProgress } from "./member-progress";

export const PersonalProgressScreen = (): ReactElement => {
	const person = useActivePerson();
	return (
		<ClubShell title="Progress & feedback" subtitle={person.name}>
			<MemberProgress member={person} />
		</ClubShell>
	);
};
