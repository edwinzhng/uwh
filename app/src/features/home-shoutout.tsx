import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { Stack, SummaryCard, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import { type ClubShoutout, shoutoutLabel } from "../domain/shoutouts";
import { ShoutoutEditor } from "./shoutout-editor";

export const HomeShoutout = ({
	latest,
}: {
	latest: ClubShoutout;
}): ReactElement => {
	const router = useRouter();
	return (
		<SummaryCard
			title="⭐ Shoutouts"
			tone="recognition"
			category="amber"
			metadata={formatDate(latest.date)}
			onPress={(): void => router.push("/shoutouts")}
			accessibilityLabel={`Shoutouts. For ${latest.personName}. ${latest.body || shoutoutLabel(latest.category)}. ${formatDate(latest.date)}. Read your recognition`}
			action={<ShoutoutEditor compact />}
		>
			<Stack gap="xs">
				<Text variant="label">{latest.personName}</Text>
				<Text lines={3}>{latest.body || shoutoutLabel(latest.category)}</Text>
				{latest.body ? (
					<Text variant="caption" tone="secondary">
						{shoutoutLabel(latest.category)}
					</Text>
				) : undefined}
			</Stack>
		</SummaryCard>
	);
};
