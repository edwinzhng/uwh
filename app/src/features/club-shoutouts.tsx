import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	EmptyState,
	ListItem,
	Row,
	SpotlightCard,
	Stack,
} from "../design-system";
import { clubShoutoutPreview, shoutoutLabel } from "../domain/shoutouts";
import { DataPage } from "./data-page";
import { FeedbackCard } from "./feedback-card";
import { ShoutoutEditor } from "./shoutout-editor";

export const ClubShoutouts = ({
	compact = false,
}: {
	compact?: boolean;
}): ReactElement => {
	const { data, account } = useApp();
	const person = useActivePerson();
	const router = useRouter();
	const preview = clubShoutoutPreview(
		data.feedback,
		data.members,
		account,
		person.id,
	);
	if (compact)
		return (
			<DataPage
				config={{
					query: api.pages.shoutouts,
					args: { personId: person.id },
					preview,
					size: 1,
					showMore: false,
				}}
			>
				{(entries) => {
					const latest = entries.at(0);
					return (
						<SpotlightCard title="Shoutouts" tone="violet">
							<Stack gap="sm">
								{latest ? (
									<ListItem
										title={latest.body || shoutoutLabel(latest.category)}
										emphasis="subtle"
										description={
											latest.body
												? `For ${latest.personName} · ${shoutoutLabel(latest.category)}`
												: `For ${latest.personName}`
										}
										onPress={(): void => router.push("/shoutouts")}
									/>
								) : undefined}
								<Row justify="end">
									<ShoutoutEditor compact />
								</Row>
							</Stack>
						</SpotlightCard>
					);
				}}
			</DataPage>
		);
	return (
		<Stack gap="sm">
			<DataPage
				config={{
					query: api.pages.shoutouts,
					args: { personId: person.id },
					preview,
					size: 15,
					showMore: true,
				}}
			>
				{(items) =>
					items.length ? (
						items.map((entry) => (
							<FeedbackCard
								key={entry.id}
								entry={entry}
								recipientName={entry.personName}
							/>
						))
					) : (
						<EmptyState
							title="No shoutouts"
							description="Visible only to you and your household."
						/>
					)
				}
			</DataPage>
		</Stack>
	);
};
