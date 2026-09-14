import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
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
	const [kind, setKind] = useState<"members" | "events">("members");
	const [error, setError] = useState("");
	return (
		<Stack>
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
					preview: [],
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
