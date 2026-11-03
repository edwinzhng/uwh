import { type ReactElement, useState } from "react";
import {
	EmptyState,
	Field,
	List,
	PersonChoice,
	Stack,
	Text,
} from "../design-system";
import type { Member } from "../domain/app-types";

export const ProgramRosterFields = ({
	members,
	value,
	onChange,
	disabled,
}: {
	members: Member[];
	value: string[];
	onChange: (ids: string[]) => void;
	disabled: boolean;
}): ReactElement => {
	const [search, setSearch] = useState("");
	const matching = members.filter(
		(member) =>
			!member.archived &&
			member.name.toLowerCase().includes(search.trim().toLowerCase()),
	);
	return (
		<Stack>
			<Text variant="small" tone="secondary">
				Program membership controls RSVP eligibility. It does not change login,
				family links, or coaching access.
			</Text>
			<Field
				label="Search members"
				value={search}
				onValueChange={setSearch}
				isDisabled={disabled}
			/>
			<Text variant="label">{value.length} members selected</Text>
			<List>
				{matching.map((member) => (
					<PersonChoice
						key={member.id}
						name={member.name}
						personId={member.id}
						checked={value.includes(member.id)}
						isDisabled={disabled}
						onChange={(checked): void => {
							if (!disabled)
								onChange(
									checked
										? [...value, member.id]
										: value.filter((id) => id !== member.id),
								);
						}}
					/>
				))}
			</List>
			{!matching.length ? (
				<EmptyState
					title="No matching members"
					description="Try another name."
				/>
			) : undefined}
		</Stack>
	);
};
