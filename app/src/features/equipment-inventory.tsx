import type { ReactElement } from "react";
import {
	Badge,
	Button,
	Divider,
	EmptyState,
	IconButton,
	Row,
	Stack,
	Text,
} from "../design-system";
import type { Equipment, Loan } from "../domain/app-types";
import { equipmentStock } from "../domain/equipment";
import { LocalPage } from "./local-page";

export const EquipmentInventory = ({
	items,
	loans,
	busy,
	onEdit,
	onIssue,
}: {
	items: Equipment[];
	loans: Loan[];
	busy: boolean;
	onEdit: (item: Equipment) => void;
	onIssue: (id: string) => void;
}): ReactElement => (
	<LocalPage items={items}>
		{(page) => (
			<Stack gap="sm">
				{page.map((item, index) => {
					const stock = equipmentStock(item, loans);
					return (
						<Stack key={item.id} gap="sm">
							{index > 0 ? <Divider /> : undefined}
							<Stack gap="xs" padding="xs">
								<Row justify="between">
									<Stack gap="xxs" grow>
										<Text variant="label">{item.name}</Text>
										{item.size ? (
											<Text variant="caption" tone="secondary">
												{item.size}
											</Text>
										) : undefined}
									</Stack>
									<IconButton
										icon="edit"
										label={`Edit ${item.name}`}
										onPress={(): void => onEdit(item)}
									/>
								</Row>
								<Row justify="between">
									<Stack gap="xxs" grow>
										<Text variant="small">
											{stock.available} / {stock.total} available
										</Text>
										{stock.onLoan ? (
											<Text variant="caption" tone="secondary">
												{stock.onLoan} on loan
											</Text>
										) : undefined}
									</Stack>
									{item.condition === "repair" ? (
										<Badge label="Repair" kind="warning" />
									) : (
										<Button
											label="Issue"
											variant="secondary"
											isDisabled={busy || stock.available === 0}
											onPress={(): void => onIssue(item.id)}
										/>
									)}
								</Row>
							</Stack>
						</Stack>
					);
				})}
				{!page.length ? (
					<Stack padding="sm">
						<EmptyState
							title="No items"
							description="Add equipment to start tracking your inventory."
						/>
					</Stack>
				) : undefined}
			</Stack>
		)}
	</LocalPage>
);
