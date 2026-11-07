import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { SummaryCard, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import { type ClubShoutout, shoutoutLabel } from "../domain/shoutouts";

export const HomeShoutout = ({
	latest,
}: {
	latest: ClubShoutout;
}): ReactElement => {
	const router = useRouter();
	return (
		<SummaryCard
			title="Shoutouts"
			icon="star"
			compact
			tone="recognition"
			category="amber"
			metadata={
				latest.body
					? `${shoutoutLabel(latest.category)} · ${formatDate(latest.date)}`
					: formatDate(latest.date)
			}
			onPress={(): void => router.push("/shoutouts")}
			accessibilityLabel={`Shoutouts. For ${latest.personName}. ${latest.body || shoutoutLabel(latest.category)}. ${formatDate(latest.date)}. Read your recognition`}
		>
			{latest.body ? (
				<Text variant="small" lines={2}>
					“{latest.body.trim()}”
				</Text>
			) : (
				<Text variant="small" lines={2}>
					{shoutoutLabel(latest.category)}
				</Text>
			)}
		</SummaryCard>
	);
};
