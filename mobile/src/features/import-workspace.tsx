import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { friendlyError } from "../backend/errors";
import { pickImportFile } from "../backend/pick-import-file";
import { useImportJob } from "../backend/use-import-job";
import {
	Button,
	Field,
	FileDownload,
	Progress,
	Row,
	SectionHeading,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import {
	type CsvTable,
	importTemplate,
	mapImportColumns,
	parseImportCsv,
} from "../domain/import-csv";
import {
	type ImportKind,
	importFields,
	importKinds,
} from "../domain/import-data";
import { ConfirmButton } from "./confirm-button";
import { DataPage } from "./data-page";
import { ImportDirectory } from "./import-directory";
import { ImportReview } from "./import-review";
import { SeasonSelect } from "./season-select";
import { useSeason } from "./use-season";
export const ImportWorkspace = (): ReactElement => {
	const [season] = useSeason();
	const [kind, setKind] = useState<ImportKind>("members");
	const [source, setSource] = useState("sporteasy");
	const [table, setTable] = useState<CsvTable>();
	const [name, setName] = useState("");
	const [mapping, setMapping] = useState<Record<string, string>>({});
	const [error, setError] = useState("");
	const job = useImportJob();
	const pick = async (): Promise<void> => {
		setError("");
		try {
			const file = await pickImportFile();
			if (!file) return;
			const table = parseImportCsv(file.contents);
			setTable(table);
			setName(file.name);
			job.reset();
			setMapping(
				Object.fromEntries(
					importFields[kind].map((field) => [
						field.key,
						table.headers.find(
							(header) =>
								header.toLowerCase().replaceAll(" ", "_") === field.key,
						) ?? "",
					]),
				),
			);
		} catch (error) {
			setError(friendlyError(error));
		}
	};
	const plans = job.batches.flatMap((batch, index) =>
		batch.preview.plans.map((plan) => ({
			...plan,
			row: plan.row + index * 25,
		})),
	);
	const canPreview = Boolean(
		table &&
			importFields[kind]
				.filter((field) => field.required)
				.every((field) => mapping[field.key]),
	);
	return (
		<Stack gap="xl">
			<Stack gap="sm">
				<SectionHeading>Import CSV</SectionHeading>
				<Surface>
					<Stack>
						<Text variant="small" tone="secondary">
							Import members, then events, registration and payments. Use the
							same source and IDs when retrying. Up to 500 rows per file.
						</Text>
						<Select
							label="Import"
							value={kind}
							isDisabled={job.busy}
							options={importKinds}
							onValueChange={(value): void => {
								if (value) {
									setKind(value);
									setTable(undefined);
									job.reset();
								}
							}}
						/>
						<SeasonSelect isDisabled={job.busy} onChange={job.reset} />
						<Field
							label="Source"
							value={source}
							onValueChange={(value): void => {
								setSource(value);
								job.reset();
							}}
							isDisabled={job.busy}
						/>
						<Row wrap>
							<Button
								label="Choose CSV"
								prefix="plus"
								variant="secondary"
								isDisabled={job.busy}
								onPress={(): void => {
									void pick();
								}}
							/>
							<FileDownload
								label="Template"
								filename={`${kind}-template.csv`}
								mimeType="text/csv"
								contents={importTemplate(kind)}
								onError={setError}
							/>
						</Row>
						{table ? (
							<>
								<Text variant="small">
									{name} · {table.rows.length} rows
								</Text>
								<SectionHeading>Columns</SectionHeading>
								{importFields[kind].map((field) => (
									<Select
										key={field.key}
										label={field.label}
										value={mapping[field.key] || "none"}
										isDisabled={job.busy}
										options={[
											{
												value: "none",
												label: field.required
													? "Choose column"
													: "Not included",
											},
											...table.headers.map((header) => ({
												value: header,
												label: header,
											})),
										]}
										onValueChange={(value): void => {
											setMapping({
												...mapping,
												[field.key]: value === "none" ? "" : (value ?? ""),
											});
											job.reset();
										}}
									/>
								))}
								<Button
									label="Preview import"
									isLoading={job.busy && !job.completed}
									isDisabled={!canPreview || job.busy}
									onPress={(): void => {
										if (table)
											void job.preview({
												source,
												kind,
												seasonId: season,
												rows: mapImportColumns(table, mapping),
											});
									}}
								/>
							</>
						) : undefined}
						{plans.length ? (
							<>
								<ImportReview plans={plans} onError={setError} />
								<Progress
									label="Import progress"
									value={job.completed}
									max={job.batches.length}
								/>
								<Text variant="small">
									{job.done
										? "Import complete."
										: `${job.completed} of ${job.batches.length} batches saved`}
								</Text>
								{!job.done ? (
									<ConfirmButton
										label={
											job.completed ? "Continue import" : "Import reviewed rows"
										}
										title="Import reviewed rows?"
										description="Add the reviewed records to this club. There is no bulk undo."
										confirmLabel="Import rows"
										isDisabled={
											job.busy || plans.some((plan) => plan.status === "error")
										}
										onConfirm={() => job.commit()}
									/>
								) : undefined}
							</>
						) : undefined}
						{error || job.error ? (
							<Text tone="danger" variant="small">
								{error || job.error}
							</Text>
						) : undefined}
					</Stack>
				</Surface>
			</Stack>
			<Surface>
				<ImportDirectory />
			</Surface>
			<Stack gap="sm">
				<SectionHeading>Import history</SectionHeading>
				<Surface>
					<Stack>
						<DataPage
							config={{
								query: api.imports.history,
								args: {},
								preview: [],
								size: 10,
							}}
						>
							{(entries) => (
								<Stack>
									{entries.map((entry) => (
										<Stack key={entry._id} gap="xxs">
											<Text variant="small">
												{entry.source} · {entry.kind} · {entry.created} added,{" "}
												{entry.skipped} linked or skipped
											</Text>
											<Text variant="caption" tone="secondary">
												{new Date(entry.createdAt).toLocaleDateString()} ·{" "}
												{entry.actor}
											</Text>
										</Stack>
									))}
									{!entries.length ? (
										<Text variant="small" tone="secondary">
											No imports yet.
										</Text>
									) : undefined}
								</Stack>
							)}
						</DataPage>
					</Stack>
				</Surface>
			</Stack>
		</Stack>
	);
};
