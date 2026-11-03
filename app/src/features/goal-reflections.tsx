import { type ReactElement, useState } from "react";
import type { GoalReflectionService } from "../backend/use-goal-reflections";
import {
	Button,
	Dialog,
	InfiniteScroll,
	List,
	ListItem,
	LoadingContent,
	Stack,
	Text,
} from "../design-system";
import type { Member } from "../domain/app-types";
import { displayDate } from "../domain/date-display";
import { goalCategoryLabel } from "../domain/goals";
import { GoalReflectionForm } from "./goal-reflection-form";

export const GoalReflections = ({
	member,
	open,
	onClose,
	service,
}: {
	member: Member;
	open: boolean;
	onClose: () => void;
	service: GoalReflectionService;
}): ReactElement => {
	const [historyOpen, setHistoryOpen] = useState(false);
	return (
		<>
			<Button
				label="Reflections"
				prefix="list"
				variant="ghost"
				compact
				onPress={(): void => setHistoryOpen(true)}
			/>
			<Dialog
				title="Goal reflections"
				isOpen={historyOpen}
				onOpenChange={setHistoryOpen}
			>
				<Stack gap="sm">
					<Text variant="small">
						Visible to {member.name}, linked guardians, and coaches.
					</Text>
					{service.loading ? (
						<LoadingContent />
					) : service.reflections.length > 0 ? (
						<List>
							{service.reflections.map((entry) => (
								<ListItem
									key={entry.id}
									title={`${displayDate(entry.createdAt)} · ${entry.selfRating}/5`}
									description={`${entry.goalDetails ? `${goalCategoryLabel(entry.goalDetails)} · ` : ""}${entry.goal}${entry.goalDetails?.remarks ? ` · ${entry.goalDetails.remarks}` : ""}${entry.note ? ` — ${entry.note}` : ""}`}
								/>
							))}
						</List>
					) : (
						<Text variant="small" tone="secondary">
							No reflections yet.
						</Text>
					)}
					{service.canLoadMore || service.loadingMore ? (
						<InfiniteScroll
							loadMore={service.loadMore}
							loading={service.loadingMore}
							revision={service.reflections.length}
							disabled={false}
						/>
					) : undefined}
				</Stack>
			</Dialog>
			{open ? (
				<GoalReflectionForm
					member={member}
					record={service.record}
					onClose={onClose}
				/>
			) : undefined}
		</>
	);
};
