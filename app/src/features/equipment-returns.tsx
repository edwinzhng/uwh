import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Badge, EmptyState, List, ListItem } from "../design-system";
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
	const people = new Map(
		data.members.map((person) => [person.id, person.name]),
	);
	return (
		<DataPage
			config={{
				query: api.pages.returns,
				args: { search: term },
				preview: data.loans
					.filter((loan) => loan.returned)
					.toReversed()
					.map((loan) => ({
						id: loan.id,
						item: equipment.get(loan.itemId) ?? "Equipment",
						person: people.get(loan.personId) ?? "Former member",
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
							title={term ? "No returns found" : "No returns yet"}
							description={
								term
									? "Try another item or member name."
									: "Returned equipment will appear here after a loan is marked returned."
							}
						/>
					) : undefined}
				</List>
			)}
		</DataPage>
	);
};
