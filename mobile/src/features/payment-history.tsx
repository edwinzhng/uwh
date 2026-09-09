import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Row, Stack, Text } from "../design-system";
import { money } from "../domain/app-rules";
import { DataPage } from "./data-page";
export const PaymentHistory = ({
	personId,
}: {
	personId: string;
}): ReactElement => {
	const { data } = useApp();
	return (
		<DataPage
			config={{
				query: api.pages.payments,
				args: { personId },
				preview: data.payments
					.filter((entry) => entry.personId === personId)
					.toReversed(),
				size: 20,
			}}
		>
			{(items) => (
				<Stack gap="sm">
					{items.map((entry) => (
						<Row key={entry.id} justify="between">
							<Text variant="small" tone="secondary">
								{entry.note}
							</Text>
							<Text variant="small">{money(entry.amount)}</Text>
						</Row>
					))}
				</Stack>
			)}
		</DataPage>
	);
};
