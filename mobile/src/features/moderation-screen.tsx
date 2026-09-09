import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useChatSafety } from "../backend/chat-safety";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Dialog,
	ListItem,
	Row,
	SegmentedControl,
	Stack,
	Surface,
	Text,
	Toggle,
} from "../design-system";
import { ChatFilterSettings } from "./chat-filter-settings";
import { ClubShell } from "./club-shell";
import { DataPage } from "./data-page";
import { MessagePhoto } from "./message-photo";
import { useTask } from "./use-task";

export const ModerationScreen = (): ReactElement => {
	const { account, source } = useApp();
	const safety = useChatSafety();
	const router = useRouter();
	const task = useTask();
	const [tab, setTab] = useState<"open" | "reviewed">("open");
	const [selected, setSelected] = useState<Doc<"chatReports">>();
	const [pause, setPause] = useState(false);
	const report = selected;
	const review = async (decision: "removed" | "dismissed"): Promise<void> => {
		if (!report) return;
		const ok = await task.run(async (): Promise<void> => {
			await safety.review?.(report._id, decision, pause);
		});
		if (ok) setSelected(undefined);
	};
	return (
		<ClubShell
			title="Moderation"
			staffRole={account.admin ? "admin" : undefined}
			back={
				<Button
					label="Admin"
					prefix="arrowLeft"
					variant="ghost"
					onPress={(): void => router.navigate("/administration")}
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
								<Stack>
									{items.map((entry) => (
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
									{!items.length ? (
										<Text variant="small" tone="secondary">
											No reports
										</Text>
									) : undefined}
								</Stack>
							</Surface>
						)}
					</DataPage>
					{safety.queue?.restrictions.length ? (
						<Surface>
							<Stack>
								<Text variant="h4">Paused chat access</Text>
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
							</Stack>
						</Surface>
					) : undefined}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
					<Dialog
						staffRole="admin"
						title="Reported message"
						isOpen={Boolean(report)}
						onOpenChange={(open): void => {
							if (!open && !task.busy) setSelected(undefined);
						}}
						footer={
							report?.state === "open" ? (
								<Row>
									<Button
										label="Dismiss"
										variant="secondary"
										isDisabled={task.busy}
										onPress={(): void => {
											void review("dismissed");
										}}
									/>
									<Button
										label="Remove message"
										variant="danger"
										isLoading={task.busy}
										onPress={(): void => {
											void review("removed");
										}}
									/>
								</Row>
							) : undefined
						}
					>
						<Stack>
							<Text variant="label">{report?.author}</Text>
							<Text variant="small">{report?.body || "Photo message"}</Text>
							{report?.imageIds.map((id) => (
								<MessagePhoto key={id} image={{ id, name: "Reported photo" }} />
							))}
							<Text variant="label">Report</Text>
							<Text variant="small">{report?.reason}</Text>
							{report?.state === "open" && report.subjectId ? (
								<Toggle
									label="Pause this account’s chat access"
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
