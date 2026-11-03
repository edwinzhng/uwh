import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	Button,
	EmptyState,
	Field,
	List,
	ListItem,
	Stack,
} from "../design-system";
import { DataPage } from "./data-page";
import { useSearchTerm } from "./use-search-term";

export const ResourcePlayerPicker = ({
	selected,
	disabled,
	onSelect,
	label = "Tag players",
	actionLabel = "Add",
}: {
	selected: string[];
	disabled: boolean;
	onSelect: (id: string, name: string) => void;
	label?: string;
	actionLabel?: string;
}): ReactElement => {
	const { data } = useApp();
	const [search, setSearch] = useState("");
	const term = useSearchTerm(search);
	const preview = data.members
		.filter(
			(member) =>
				!member.archived &&
				member.programs.length &&
				member.name.toLowerCase().includes(term.toLowerCase()),
		)
		.map((member) => ({ member, roles: "" }));
	return (
		<Stack gap="xs">
			<Field
				label={label}
				value={search}
				onValueChange={setSearch}
				placeholder="Search player names"
				isDisabled={disabled}
			/>
			{term ? (
				<DataPage
					config={{
						query: api.pages.members,
						args: { search: term },
						preview,
						size: 20,
					}}
				>
					{(items) => (
						<List>
							{items
								.filter(({ member }) => member.programs.length > 0)
								.map(({ member }) => (
									<ListItem
										key={member.id}
										title={member.name}
										trailing={
											<Button
												label={
													selected.includes(member.id) ? "Added" : actionLabel
												}
												variant="ghost"
												compact
												isDisabled={disabled || selected.includes(member.id)}
												onPress={(): void => {
													onSelect(member.id, member.name);
													setSearch("");
												}}
											/>
										}
									/>
								))}
							{!items.length ? (
								<EmptyState
									title="No players found"
									description="Try a different name."
								/>
							) : undefined}
						</List>
					)}
				</DataPage>
			) : undefined}
		</Stack>
	);
};
