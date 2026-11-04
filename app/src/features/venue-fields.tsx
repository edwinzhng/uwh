import type { ReactElement } from "react";
import { newId } from "../demo/app-state";
import {
	Button,
	Field,
	IconButton,
	Row,
	Stack,
	Surface,
} from "../design-system";
import type { VenueEntry } from "../domain/venue";

export const VenueFields = ({
	venues,
	onChange,
	isDisabled,
}: {
	venues: VenueEntry[];
	onChange: (venues: VenueEntry[]) => void;
	isDisabled: boolean;
}): ReactElement => (
	<Stack gap="sm">
		{venues.map((venue, index) => (
			<Surface key={venue.id} variant="subtle">
				<Stack gap="sm">
					<Row justify="between">
						<Field
							label={`Venue ${index + 1} name`}
							value={venue.name}
							onValueChange={(name): void =>
								onChange(
									venues.map((entry) =>
										entry.id === venue.id ? { ...entry, name } : entry,
									),
								)
							}
							isDisabled={isDisabled}
						/>
						<IconButton
							icon="close"
							label={`Remove ${venue.name || `venue ${index + 1}`}`}
							isDisabled={isDisabled}
							onPress={(): void =>
								onChange(venues.filter((entry) => entry.id !== venue.id))
							}
						/>
					</Row>
					<Field
						label="Address"
						value={venue.address}
						onValueChange={(address): void =>
							onChange(
								venues.map((entry) =>
									entry.id === venue.id ? { ...entry, address } : entry,
								),
							)
						}
						isDisabled={isDisabled}
					/>
				</Stack>
			</Surface>
		))}
		<Row>
			<Button
				label="Add venue"
				prefix="plus"
				variant="secondary"
				isDisabled={isDisabled}
				onPress={(): void =>
					onChange([...venues, { id: newId(), name: "", address: "" }])
				}
			/>
		</Row>
	</Stack>
);
