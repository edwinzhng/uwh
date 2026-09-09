import { useQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { FileDownload, Text } from "../design-system";
export const HouseholdCalendarDownload = ({
	personIds,
	onError,
}: {
	personIds: string[];
	onError: (error: string) => void;
}): ReactElement => {
	const contents = useQuery(api.calendar.householdSnapshot, { personIds });
	return contents === undefined ? (
		<Text variant="small" tone="secondary">
			Preparing calendar…
		</Text>
	) : (
		<FileDownload
			label="Download .ics"
			filename="club-calendar.ics"
			contents={contents}
			onError={onError}
		/>
	);
};
