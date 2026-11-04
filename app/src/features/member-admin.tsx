import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { Member } from "../domain/app-types";
import { MemberTrackers } from "./member-trackers";
import { ReturnLoanButton } from "./return-loan-button";
import { SeasonMembership } from "./season-membership";

export const MemberAdmin = ({
	member,
	readOnly = false,
}: {
	member: Member;
	readOnly?: boolean;
}): ReactElement => {
	const { data, account } = useApp();
	const editable = account.admin && !readOnly;
	const loans = data.loans.filter(
		(entry) => entry.personId === member.id && !entry.returned,
	);
	return (
		<Stack gap="xl">
			{member.archived ? (
				<Badge label="Archived member" kind="warning" />
			) : undefined}
			<SeasonMembership personId={member.id} editable={editable}>
				<MemberTrackers member={member} editable={editable} />
				<Stack gap="sm">
					<SectionHeading>Equipment</SectionHeading>
					<Surface variant="plain">
						<Stack>
							{loans.length ? (
								loans.map((loan) => (
									<Row key={loan.id} justify="between" wrap>
										<Stack gap="xxs">
											<Text variant="label">
												{
													data.equipment.find((item) => item.id === loan.itemId)
														?.name
												}
											</Text>
											<Text variant="small" tone="secondary">
												Due {loan.due}
											</Text>
										</Stack>
										{editable ? (
											<ReturnLoanButton loan={loan} />
										) : (
											<Badge label="On loan" />
										)}
									</Row>
								))
							) : (
								<Text variant="small" tone="secondary">
									No equipment on loan
								</Text>
							)}
						</Stack>
					</Surface>
				</Stack>
			</SeasonMembership>
		</Stack>
	);
};
