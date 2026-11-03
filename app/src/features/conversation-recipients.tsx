import { type ReactElement, useState } from "react";
import {
	Field,
	InfiniteScroll,
	List,
	PersonChoice,
	Stack,
	Text,
} from "../design-system";
import { groupLimits } from "../domain/group-conversation";
import type { RecipientDirectory } from "../domain/message-recipients";
import { recipientPersonId } from "../domain/message-recipients";

export const ConversationRecipients = ({
	directory,
	selected,
	onChange,
	disabled,
}: {
	directory: RecipientDirectory;
	selected: string[];
	onChange: (ids: string[]) => void;
	disabled: boolean;
}): ReactElement => {
	const [search, setSearch] = useState("");
	const [limit, setLimit] = useState(20);
	const matches = directory.recipients.filter((recipient) =>
		[recipient.name, ...recipient.playerNames].some((name) =>
			name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
		),
	);
	return (
		<Stack gap="sm">
			<Field
				label="To"
				inputMode="search"
				placeholder="Find people"
				value={search}
				isDisabled={disabled}
				onValueChange={(value): void => {
					setSearch(value);
					setLimit(20);
				}}
			/>
			{selected.length ? (
				<Text variant="caption" tone="secondary">
					{selected.length} {selected.length === 1 ? "person" : "people"}{" "}
					selected
				</Text>
			) : undefined}
			<List>
				{matches.slice(0, limit).map((recipient) => (
					<PersonChoice
						key={recipient.id}
						name={recipient.name}
						personId={recipientPersonId(recipient.id)}
						checked={selected.includes(recipient.id)}
						isDisabled={
							disabled ||
							(!selected.includes(recipient.id) &&
								selected.length >= groupLimits.recipients)
						}
						onChange={(checked): void =>
							onChange(
								checked
									? [...new Set([...selected, recipient.id])]
									: selected.filter((id) => id !== recipient.id),
							)
						}
					/>
				))}
			</List>
			{!matches.length ? (
				<Text variant="small" tone="secondary">
					No people found.
				</Text>
			) : undefined}
			{matches.length > limit ? (
				<InfiniteScroll
					loadMore={(): void => setLimit((current) => current + 20)}
					loading={undefined}
					revision={limit}
					disabled={disabled}
				/>
			) : undefined}
		</Stack>
	);
};
