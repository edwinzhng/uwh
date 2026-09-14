import type { ReactElement } from "react";
import { useActivePerson } from "../demo/app-state";
import { Text } from "../design-system";
import { ClubShell } from "./club-shell";
import { MemberAdmin } from "./member-admin";

export const PersonalMembershipScreen = (): ReactElement => {
	const person = useActivePerson();
	return (
		<ClubShell title="Membership" subtitle={person.name}>
			<Text variant="small" tone="secondary">
				Contact a club administrator to complete registration, update membership
				details or arrange payment. Payments shown here are records of money
				already received.
			</Text>
			<MemberAdmin key={person.id} member={person} readOnly />
		</ClubShell>
	);
};
