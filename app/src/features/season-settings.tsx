import { type ReactElement, useState } from "react";
import { newId, useApp, useAppStatus } from "../demo/app-state";
import {
	Button,
	DatePicker,
	Dialog,
	Field,
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";

export const SeasonSettings = (): ReactElement => {
	const { data, dispatch } = useApp();
	const { busy } = useAppStatus();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [start, setStart] = useState<string>();
	const [end, setEnd] = useState<string>();
	const save = async (): Promise<void> => {
		if (
			start &&
			end &&
			(await dispatch({
				type: "add-season",
				season: { id: newId(), name, start, end },
			}))
		) {
			setOpen(false);
			setName("");
		}
	};
	return (
		<Stack gap="heading">
			<SectionHeading
				action={
					<Button
						label="Season"
						prefix="plus"
						variant="secondary"
						onPress={(): void => setOpen(true)}
					/>
				}
			>
				Seasons
			</SectionHeading>
			<Surface>
				<List>
					{data.seasons.map((season) => (
						<ListItem
							key={season.id}
							title={season.name}
							description={`${season.start} – ${season.end}`}
						/>
					))}
				</List>
				<Dialog
					intent="form"
					isDismissDisabled={busy}
					title="New season"
					isOpen={open}
					onOpenChange={(value): void => {
						if (!busy) setOpen(value);
					}}
					footer={
						<Button
							label="Create season"
							isLoading={busy}
							validationError={
								!name.trim() || !start || !end || end < start
									? "Check the required fields"
									: undefined
							}
							onPress={(): void => {
								void save();
							}}
						/>
					}
				>
					<Stack>
						<Field
							label="Name"
							placeholder="2027–2028"
							value={name}
							onValueChange={setName}
						/>
						<DatePicker label="Starts" value={start} onValueChange={setStart} />
						<DatePicker label="Ends" value={end} onValueChange={setEnd} />
					</Stack>
				</Dialog>
			</Surface>
		</Stack>
	);
};
