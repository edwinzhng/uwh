import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
	Badge,
	EmptyState,
	List,
	ListItem,
	LoadingContent,
	Surface,
} from "../design-system";
import { money } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import type { SeasonRecord } from "../domain/season-ledger";
export const SeasonRosterContent = ({
	members,
	section,
	records,
}: {
	members: Member[];
	section: string;
	records?: SeasonRecord[];
}): ReactElement => {
	const router = useRouter();
	return (
		<Surface>
			<List>
				{!records ? (
					<LoadingContent />
				) : (
					members.map((member) => {
						const record = records.find(
							(record) => record.personId === member.id,
						);
						const due = (record?.due ?? 0) - (record?.paid ?? 0);
						const registrationLabel =
							record?.registration === "approved"
								? "Approved"
								: record?.registration === "submitted"
									? "Awaiting review"
									: "Missing registration";
						const accountLabel =
							section === "registration"
								? `CUGA: ${record?.cuga ? "Yes" : "No"}`
								: due > 0
									? `${money(due)} due`
									: due < 0
										? `${money(-due)} credit`
										: "Settled";
						return (
							<ListItem
								key={member.id}
								title={member.name}
								accessibilityLabel={`${member.name}. ${registrationLabel}. ${accountLabel}`}
								avatar={member.name}
								avatarId={member.id}
								titleAccessory={
									<Badge
										label={registrationLabel}
										kind={
											record?.registration === "approved"
												? "success"
												: record?.registration === "submitted"
													? "pending"
													: "warning"
										}
									/>
								}
								trailing={
									<Badge
										label={accountLabel}
										kind={
											section === "registration"
												? record?.cuga
													? "success"
													: "warning"
												: due > 0
													? "warning"
													: "neutral"
										}
									/>
								}
								onPress={(): void =>
									router.push({
										pathname: "/member",
										params: { id: member.id, tab: "admin" },
									})
								}
							/>
						);
					})
				)}
				{records && !members.length ? (
					<EmptyState
						title="No members found"
						description="Try a different search or season."
					/>
				) : undefined}
			</List>
		</Surface>
	);
};
