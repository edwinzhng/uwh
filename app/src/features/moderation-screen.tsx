import { useRouter } from "expo-router";
import { useAtomValue, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useChatSafety } from "../backend/chat-safety";
import { useApp } from "../demo/app-state";
import {
	type PreviewPerformanceReport,
	previewPerformanceReportFixture,
	previewPerformanceReportReview,
	previewPerformanceReports,
} from "../demo/session-performance-state";
import {
	Badge,
	Button,
	Dialog,
	EmptyState,
	List,
	ListItem,
	Row,
	SectionHeading,
	SegmentedControl,
	Stack,
	Surface,
	Text,
	Toggle,
} from "../design-system";
import { ChatFilterSettings } from "./chat-filter-settings";
import { ClubShell } from "./club-shell";
import { ConfirmButton } from "./confirm-button";
import { DataPage } from "./data-page";
import { MessagePhoto } from "./message-photo";
import { useReviewFlow } from "./use-review-flow";
import { useTask } from "./use-task";

export const ModerationScreen = (): ReactElement => {
	const { account, source } = useApp();
	const safety = useChatSafety();
	const router = useRouter();
	const task = useTask();
	const reviewFlow = useReviewFlow();
	const [tab, setTab] = useState<"open" | "reviewed">("open");
	const [selected, setSelected] = useState<
		Doc<"chatReports"> | PreviewPerformanceReport | undefined
	>(
		reviewFlow === "review-session-note-report"
			? previewPerformanceReportFixture
			: undefined,
	);
	const previewReports = useAtomValue(previewPerformanceReports);
	useHydrateAtoms(
		new Map([
			[
				previewPerformanceReports,
				reviewFlow === "review-session-note-report"
					? [previewPerformanceReportFixture]
					: previewReports,
			],
		]),
	);
	const reviewPreview = useSetAtom(previewPerformanceReportReview);
	const [pause, setPause] = useState(false);
	const report = selected;
	const contentSource =
		report && "contentSource" in report ? report.contentSource : undefined;
	const review = async (
		decision: "removed" | "dismissed",
	): Promise<boolean> => {
		if (!report) return false;
		const ok = await task.run(async (): Promise<void> => {
			if ("preview" in report) reviewPreview({ id: report._id, decision });
			else await safety.review?.(report._id, decision, pause);
		});
		if (ok) setSelected(undefined);
		return ok;
	};
	return (
		<ClubShell
			title="Moderation"
			back={
				<Button
					label="Club"
					prefix="arrowLeft"
					variant="ghost"
					onPress={(): void => router.navigate("/club")}
				/>
			}
		>
			{!account.admin ? (
				<Text>Admin access required.</Text>
			) : (
				<Stack>
					{source === "convex" ? <ChatFilterSettings /> : undefined}
					<SegmentedControl
						label="Reports"
						value={tab}
						onValueChange={setTab}
						options={[
							{ value: "open", label: "Open" },
							{ value: "reviewed", label: "Reviewed" },
						]}
					/>
					<DataPage
						config={{
							query: api.moderation.reportsPage,
							args: { view: tab },
							preview: [],
							size: 20,
						}}
					>
						{(items) => (
							<Surface>
								<List>
									{(source === "preview"
										? previewReports.filter(
												(entry) =>
													(entry.state === "open") === (tab === "open"),
											)
										: items
									).map((entry) => (
										<ListItem
											key={entry._id}
											title={entry.author}
											description={entry.reason}
											descriptionLines={2}
											trailing={
												<Badge
													label={
														entry.state === "open"
															? "Review"
															: entry.state === "removed"
																? "Removed"
																: "Dismissed"
													}
													kind={entry.state === "open" ? "warning" : "neutral"}
												/>
											}
											onPress={() => {
												setSelected(entry);
												setPause(false);
												task.clear();
											}}
										/>
									))}
									{!(
										source === "preview"
											? previewReports.filter(
													(entry) =>
														(entry.state === "open") === (tab === "open"),
												)
											: items
									).length ? (
										<EmptyState title="No reports" />
									) : undefined}
								</List>
							</Surface>
						)}
					</DataPage>
					{safety.queue?.restrictions.length ? (
						<Stack gap="heading">
							<SectionHeading>Paused sharing</SectionHeading>
							<Surface>
								<List>
									{safety.queue?.restrictions.map((entry) => (
										<ListItem
											key={entry.id}
											title={entry.name}
											trailing={
												<Button
													label="Restore"
													variant="secondary"
													isDisabled={task.busy}
													onPress={(): void => {
														void task.run(async (): Promise<void> => {
															await safety.restore?.(entry.id);
														});
													}}
												/>
											}
										/>
									))}
								</List>
							</Surface>
						</Stack>
					) : undefined}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
					<Dialog
						intent="detail"
						isDismissDisabled={task.busy}
						title={
							report?.author === "Deleted account"
								? "Reported content"
								: contentSource
									? "Reported content"
									: report?.source
										? "Reported session feedback"
										: "Reported message"
						}
						isOpen={Boolean(report)}
						onOpenChange={(open): void => {
							if (!open && !task.busy) setSelected(undefined);
						}}
						footer={
							report?.state === "open" ? (
								<Row>
									<ConfirmButton
										label="Dismiss"
										title="Dismiss report?"
										description={
											"Close this report without removing the content." +
											(pause
												? " This account’s chat access will also be paused."
												: "")
										}
										confirmLabel="Dismiss report"
										variant="secondary"
										isDisabled={task.busy}
										onConfirm={() => review("dismissed")}
									/>
									<ConfirmButton
										label={
											contentSource
												? "Remove reported content"
												: report.source
													? "Remove session feedback"
													: "Remove message"
										}
										title={
											contentSource
												? "Remove reported content?"
												: report.source
													? "Remove session feedback?"
													: "Remove message?"
										}
										description={
											(contentSource
												? "Remove the reported content and its uploaded media. Newer edits will not be removed."
												: report.source
													? "Remove this reported feedback version from the player’s history. Newer feedback will not be removed."
													: "Remove this message and its photos for everyone. This can’t be undone.") +
											(pause
												? " This account’s chat access will also be paused."
												: "")
										}
										confirmLabel={
											contentSource
												? "Remove reported content"
												: report.source
													? "Remove session feedback"
													: "Remove message"
										}
										danger
										variant="danger"
										isDisabled={task.busy}
										onConfirm={() => review("removed")}
									/>
								</Row>
							) : undefined
						}
					>
						<Stack>
							<Text variant="label">{report?.author}</Text>
							{report?.source ? (
								<Badge
									label={`${report.source.rating} / 10 · Session feedback`}
								/>
							) : undefined}
							<Text variant="small">
								{report?.author === "Deleted account"
									? "Content removed with the account"
									: report?.body ||
										(report?.source ? "No written comments" : "Photo message")}
							</Text>
							{report?.imageIds.map((id) => (
								<MessagePhoto key={id} image={{ id, name: "Reported photo" }} />
							))}
							<Text variant="label">Report</Text>
							<Text variant="small">{report?.reason}</Text>
							{report?.state === "open" &&
							!report.source &&
							report.subjectId ? (
								<Toggle
									label="Pause this account’s sharing"
									value={pause}
									onValueChange={setPause}
								/>
							) : undefined}
							{task.error ? (
								<Text variant="small" tone="danger">
									{task.error}
								</Text>
							) : undefined}
						</Stack>
					</Dialog>
				</Stack>
			)}
		</ClubShell>
	);
};
