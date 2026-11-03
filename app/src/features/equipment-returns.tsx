import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Badge, EmptyState, List, ListItem } from "../design-system";
import { loanBorrowerDescription } from "../domain/equipment-loans";
import { DataPage } from "./data-page";
import { useSearchTerm } from "./use-search-term";
export const EquipmentReturns = ({
	search,
}: {
	search: string;
}): ReactElement => {
	const { data } = useApp();
	const term = useSearchTerm(search);
	const equipment = new Map(data.equipment.map((item) => [item.id, item.name]));
	return (
		<DataPage
			config={{
				query: api.pages.returns,
				args: { search: term },
				preview: data.loans
					.filter((loan) => loan.returned)
					.slice()
					.reverse()
					.map((loan) => ({
						id: loan.id,
						item: equipment.get(loan.itemId) ?? "Equipment",
						person: loanBorrowerDescription(loan, data.members),
					}))
					.filter((item) =>
						(item.item + item.person)
							.toLowerCase()
							.includes(search.toLowerCase()),
					),
			}}
		>
			{(items) => (
				<List>
					{items.map((item) => (
						<ListItem
							key={item.id}
							title={item.item}
							description={item.person}
							trailing={<Badge label="Returned" />}
						/>
					))}
					{!items.length ? (
						<EmptyState
							title={term ? "No matching returns" : "No returns"}
							description={
								term ? "Try another item or borrower name." : undefined
							}
						/>
					) : undefined}
				</List>
			)}
		</DataPage>
	);
};
