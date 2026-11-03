import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Stack, SummaryCard, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import { homePendingResponse } from "../domain/home-summary";
import { ResponseControl } from "./response-control";

export const HomeActions = ({
	now,
}: {
	now: number;
}): ReactElement | undefined => {
	const { data, account } = useApp();
	const router = useRouter();
	const pending = homePendingResponse(data, account, now);
	return pending ? (
		<SummaryCard
			title="Response needed"
			category="amber"
			metadata={formatDate(pending.event.date)}
			onPress={(): void =>
				router.push({
					pathname: "/session",
					params: { event: pending.event.id },
				})
			}
			accessibilityLabel={`Respond to ${pending.event.title} for ${pending.people.map((person) => person.name).join(", ")}`}
			action={
				<Stack gap="sm">
					{pending.people.map((person) => (
						<Stack key={person.id} gap="xs">
							{pending.people.length > 1 ? (
								<Text variant="label">
									{person.id === account.personId ? "You" : person.name}
								</Text>
							) : undefined}
							<ResponseControl
								event={pending.event}
								personId={person.id}
								quick
								hideLabel
							/>
						</Stack>
					))}
				</Stack>
			}
		>
			<Stack gap="xs">
				<Text variant="h1">{pending.event.title}</Text>
				<Text variant="small" tone="secondary">
					{pending.people
						.map((person) =>
							person.id === account.personId ? "You" : person.name,
						)
						.join(", ")}{" "}
					{pending.people.length === 1 &&
					pending.people.at(0)?.id !== account.personId
						? "has"
						: "have"}{" "}
					not responded.
				</Text>
			</Stack>
		</SummaryCard>
	) : undefined;
};
