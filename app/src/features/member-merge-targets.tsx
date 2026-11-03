import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { EmptyState, Field, List, ListItem, Stack } from "../design-system";
import type { Member } from "../domain/app-types";
import { DataPage } from "./data-page";
import { useSearchTerm } from "./use-search-term";

export const MemberMergeTargets = ({
	sourceId,
	onSelect,
}: {
	sourceId: string;
	onSelect: (member: Member) => void;
}): ReactElement => {
	const { data } = useApp();
	const [search, setSearch] = useState("");
	const term = useSearchTerm(search);
	return (
		<Stack>
			<Field
				label="Active member to keep"
				placeholder="Search by name"
				value={search}
				onValueChange={setSearch}
			/>
			<DataPage
				config={{
					query: api.pages.members,
					args: { search: term, archived: false },
					preview: data.members
						.filter(
							(row) =>
								!row.archived &&
								!row.mergedInto &&
								row.id !== sourceId &&
								row.name.toLowerCase().includes(search.toLowerCase()),
						)
						.map((member) => ({ member, roles: "" })),
				}}
			>
				{(items) => (
					<List>
						{items
							.filter(
								({ member }) => member.id !== sourceId && !member.mergedInto,
							)
							.map(({ member }) => (
								<ListItem
									key={member.id}
									title={member.name}
									avatar={member.name}
									avatarId={member.id}
									onPress={(): void => onSelect(member)}
								/>
							))}
						{!items.length ? (
							<EmptyState
								title="No active members found"
								description="Try a different name."
							/>
						) : undefined}
					</List>
				)}
			</DataPage>
		</Stack>
	);
};
