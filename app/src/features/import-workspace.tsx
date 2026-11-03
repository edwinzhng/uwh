import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useImportJob } from "../backend/use-import-job";
import { useApp } from "../demo/app-state";
import {
	previewImportHistoryAtom,
	usePreviewImportJob,
} from "../demo/import-state";
import { parseImportCsv } from "../domain/import-csv";
import { DataPage } from "./data-page";
import { ImportHistory } from "./import-history";
import { ImportWorkspaceContent } from "./import-workspace-content";
import { useSeason } from "./use-season";

const exampleCsv = {
	name: "fictional-members.csv",
	contents:
		"source_id,name,member_id\nreview-rowan,Rowan Example,\nreview-skyler,Skyler Example,",
};

const LiveImportWorkspace = (): ReactElement => (
	<ImportWorkspaceContent
		job={useImportJob()}
		history={
			<DataPage
				config={{ query: api.imports.history, args: {}, preview: [], size: 10 }}
			>
				{(entries) => (
					<ImportHistory
						entries={entries.map((entry) => ({ ...entry, id: entry._id }))}
					/>
				)}
			</DataPage>
		}
	/>
);

const PreviewImportWorkspace = ({
	staged,
}: {
	staged: boolean;
}): ReactElement => {
	const [season] = useSeason();
	const history = useAtomValue(previewImportHistoryAtom);
	const job = usePreviewImportJob(
		staged
			? {
					source: "sporteasy",
					kind: "members",
					seasonId: season,
					rows: parseImportCsv(exampleCsv.contents).rows,
				}
			: undefined,
	);
	return (
		<ImportWorkspaceContent
			job={job}
			initialCsv={staged ? exampleCsv : undefined}
			history={<ImportHistory entries={history} />}
		/>
	);
};

export const ImportWorkspace = ({
	staged = false,
}: {
	staged?: boolean;
}): ReactElement =>
	useApp().source === "convex" ? (
		<LiveImportWorkspace />
	) : (
		<PreviewImportWorkspace staged={staged} />
	);
