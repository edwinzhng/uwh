import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	FileDownload,
	SectionHeading,
	Select,
	Stack,
	Text,
} from "../design-system";
import { exportCsv } from "../domain/import-csv";
import { DataPage } from "./data-page";
export const ImportDirectory = (): ReactElement => {
	const { data } = useApp();
	const [kind, setKind] = useState<"members" | "events">("members");
	const [error, setError] = useState("");
	return (
		<Stack gap="heading">
			<SectionHeading>Existing IDs</SectionHeading>
			<Select
				label="Directory"
				value={kind}
				options={[
					{ value: "members", label: "Members" },
					{ value: "events", label: "Events" },
				]}
				onValueChange={(value): void => {
					if (value) setKind(value);
				}}
			/>
			<DataPage
				key={kind}
				config={{
					query: api.imports.directory,
					args: { kind },
					preview:
						kind === "members"
							? data.members.map((member) => ({
									id: member.id,
									name: member.name,
								}))
							: data.events.map((event) => ({
									id: event.id,
									name: `${event.date} ${event.start} ${event.title}`,
								})),
					size: 100,
				}}
			>
				{(entries) => (
					<FileDownload
						label="Export this page"
						filename={`${kind}-ids.csv`}
						contents={exportCsv(entries)}
						mimeType="text/csv"
						onError={setError}
					/>
				)}
			</DataPage>
			{error ? <Text tone="danger">{error}</Text> : undefined}
		</Stack>
	);
};
