import type { ReactElement } from "react";
import { ActionMenu } from "../design-system";
import { formatTime } from "../domain/app-rules";
import type { EventPart } from "../domain/app-types";

export const SectionResponsePicker = ({
	name,
	parts,
	selected,
	disabled,
	onChange,
}: {
	name: string;
	parts: EventPart[];
	selected?: string[];
	disabled: boolean;
	onChange: (ids?: string[]) => void;
}): ReactElement => {
	const ids = selected ?? parts.map((part) => part.id);
	return (
		<ActionMenu
			label={
				ids.length === parts.length
					? "All sections"
					: `${ids.length} section${ids.length === 1 ? "" : "s"}`
			}
			accessibilityLabel={`${name} · Sections`}
			compact
			isDisabled={disabled}
			groups={[
				{
					id: "sections",
					label: "Select sections · at least one",
					items: parts.map((part) => ({
						id: part.id,
						checked: ids.includes(part.id),
						label: `${part.title} · ${formatTime(part.start)}–${formatTime(part.end)}`,
						icon: ids.includes(part.id) ? "checkboxChecked" : "stop",
						isDisabled: ids.length === 1 && ids.includes(part.id),
						onSelect: (): void => {
							const next = ids.includes(part.id)
								? ids.filter((id) => id !== part.id)
								: [...ids, part.id];
							onChange(next.length === parts.length ? undefined : next);
						},
					})),
				},
			]}
		/>
	);
};
