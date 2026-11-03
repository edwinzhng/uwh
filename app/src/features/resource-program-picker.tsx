import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Button, Combobox, List, ListItem, Stack } from "../design-system";
import { programName, programOptions } from "../domain/programs";

export const ResourceProgramPicker = ({
	selected,
	disabled,
	onChange,
}: {
	selected: string[];
	disabled: boolean;
	onChange: (ids: string[]) => void;
}): ReactElement => {
	const { data } = useApp();
	return (
		<Stack gap="xs">
			<Combobox
				label="Programs that can view"
				value={undefined}
				options={programOptions(data).filter(
					(program) => !selected.includes(program.value),
				)}
				isDisabled={disabled}
				onValueChange={(id): void => {
					if (id) onChange([...selected, id]);
				}}
			/>
			<List>
				{selected.map((id) => (
					<ListItem
						key={id}
						title={programName(data, id)}
						trailing={
							<Button
								label="Remove"
								compact
								variant="ghost"
								isDisabled={disabled}
								onPress={(): void =>
									onChange(selected.filter((entry) => entry !== id))
								}
							/>
						}
					/>
				))}
			</List>
		</Stack>
	);
};
