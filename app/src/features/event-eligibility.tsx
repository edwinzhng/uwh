import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	EmptyState,
	Field,
	List,
	PersonChoice,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";

export const EventEligibility = ({
	program,
	rosterRestricted,
	value,
	onChange,
	busy,
}: {
	program: string;
	rosterRestricted: boolean;
	value?: string[];
	onChange: (value: string[] | undefined) => void;
	busy: boolean;
}): ReactElement => {
	const { data } = useApp();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const players = data.members.filter(
		(member) => !member.archived && member.programs.length > 0,
	);
	const matchingPlayers = players.filter((player) =>
		player.name.toLowerCase().includes(search.trim().toLowerCase()),
	);
	return (
		<Stack gap="xs">
			<Select
				isDisabled={busy}
				label="Registration"
				value={value ? "selected" : "everyone"}
				options={[
					{
						value: "everyone",
						label:
							program === "all" || !rosterRestricted
								? "All players"
								: "Program roster",
					},
					{ value: "selected", label: "Selected players" },
				]}
				onValueChange={(next): void =>
					onChange(next === "selected" ? [] : undefined)
				}
			/>
			{value ? (
				<Row>
					<Button
						isDisabled={busy}
						label={`Choose players · ${value.length}`}
						prefix="users"
						variant="secondary"
						onPress={(): void => setOpen(true)}
					/>
				</Row>
			) : undefined}
			<Dialog
				intent="picker"
				isDismissDisabled={busy}
				title="Eligible players"
				isOpen={open}
				onOpenChange={(next): void => {
					if (!busy) setOpen(next);
				}}
			>
				<Stack gap="sm">
					<Field
						isDisabled={busy}
						label="Search"
						placeholder="Find a player"
						value={search}
						onValueChange={setSearch}
					/>
					<Row>
						<Button
							label="Select all"
							isDisabled={busy || !matchingPlayers.length}
							variant="ghost"
							onPress={(): void => onChange(players.map((player) => player.id))}
						/>
						<Button
							isDisabled={busy}
							label="Clear"
							variant="ghost"
							onPress={(): void => onChange([])}
						/>
					</Row>
					<List>
						{matchingPlayers.map((player) => (
							<PersonChoice
								isDisabled={busy}
								key={player.id}
								name={player.name}
								personId={player.id}
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
						{!matchingPlayers.length ? (
							<EmptyState
								title={
									search.trim()
										? "No matching players"
										: "Add players to a program first"
								}
							/>
						) : undefined}
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
