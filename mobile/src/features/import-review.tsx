import type { ReactElement } from "react";
import type { ImportPlan } from "../../convex/import_plan";
import {
	Badge,
	FileDownload,
	Row,
	SectionHeading,
	Stack,
	Text,
} from "../design-system";
import { exportCsv } from "../domain/import-csv";
import { importSummary } from "../domain/import-summary";
import { LocalPage } from "./local-page";
export const ImportReview = ({
	plans,
	onError,
}: {
	plans: ImportPlan[];
	onError: (error: string) => void;
}): ReactElement => {
	const errors = plans.filter((plan) => plan.status === "error").length;
	return (
		<Stack>
			<SectionHeading>Review</SectionHeading>
			<Text variant="small">
				{plans.filter((plan) => plan.status === "create").length} new ·{" "}
				{plans.filter((plan) => plan.status === "link").length} linked ·{" "}
				{plans.filter((plan) => plan.status === "skip").length} already imported
				· {errors} errors
			</Text>
			<LocalPage items={plans}>
				{(entries) => (
					<Stack>
						{entries.map((plan) => (
							<Stack key={plan.row} gap="xxs">
								<Row justify="between" wrap>
									<Text variant="small">
										{plan.row}. {plan.label}
									</Text>
									<Badge
										label={plan.status}
										kind={plan.status === "error" ? "danger" : "neutral"}
									/>
								</Row>
								{plan.record ? (
									<Text variant="small" tone="secondary">
										{importSummary(plan.record)}
									</Text>
								) : undefined}
								{plan.error ? (
									<Text variant="small" tone="danger">
										{plan.error}
									</Text>
								) : undefined}
							</Stack>
						))}
					</Stack>
				)}
			</LocalPage>
			<FileDownload
				label="Export review"
				filename="import-review.csv"
				contents={exportCsv(
					plans.map((plan) => ({
						row: String(plan.row),
						name: plan.label,
						details: plan.record ? importSummary(plan.record) : "",
						status: plan.status,
						error: plan.error ?? "",
						id: plan.targetId ?? "",
					})),
				)}
				mimeType="text/csv"
				onError={onError}
			/>
		</Stack>
	);
};
