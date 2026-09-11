import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Checkbox,
	Dialog,
	Field,
	List,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";

export const EventEligibility = ({
	value,
	onChange,
}: {
	value?: string[];
	onChange: (value: string[] | undefined) => void;
}): ReactElement => {
	const { data } = useApp();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const players = data.members.filter((member) => member.programs.length > 0);
	return (
		<Stack gap="xs">
			<Select
				label="Registration"
				value={value ? "selected" : "everyone"}
				options={[
					{ value: "everyone", label: "All players" },
					{ value: "selected", label: "Selected players" },
				]}
				onValueChange={(next): void =>
					onChange(next === "selected" ? [] : undefined)
				}
			/>
			{value ? (
				<Row>
					<Button
						label={`Choose players · ${value.length}`}
						prefix="users"
						variant="secondary"
						onPress={(): void => setOpen(true)}
					/>
				</Row>
			) : undefined}
			<Dialog title="Eligible players" isOpen={open} onOpenChange={setOpen}>
				<Stack gap="sm">
					<Field
						label="Search"
						placeholder="Find a player"
						value={search}
						onValueChange={setSearch}
					/>
					<Row>
						<Button
							label="Select all"
							variant="ghost"
							onPress={(): void => onChange(players.map((player) => player.id))}
						/>
						<Button
							label="Clear"
							variant="ghost"
							onPress={(): void => onChange([])}
						/>
					</Row>
					<List>
						{players
							.filter((player) =>
								player.name.toLowerCase().includes(search.toLowerCase()),
							)
							.map((player) => (
								<Checkbox
									key={player.id}
									label={player.name}
									checked={value?.includes(player.id) ?? false}
									onChange={(checked): void =>
										onChange(
											checked
												? [...(value ?? []), player.id]
												: value?.filter((id) => id !== player.id),
										)
									}
								/>
							))}
					</List>
					<Text variant="caption" tone="secondary">
						Only selected players can register. Parents can register their
						eligible children.
					</Text>
				</Stack>
			</Dialog>
		</Stack>
	);
};
