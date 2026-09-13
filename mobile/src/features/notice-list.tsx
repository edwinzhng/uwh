import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Dialog,
	EmptyState,
	List,
	ListItem,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { Notice } from "../domain/app-types";
import { isNoticeActive } from "../domain/notices";
import { DataPage } from "./data-page";
import { useClubToday } from "./use-club-today";

const NoticeRows = ({ items }: { items: Notice[] }): ReactElement => {
	const { account, dispatch, busy } = useApp();
	const today = useClubToday();
	const [selected, setSelected] = useState<string>();
	const notice = items.find((entry) => entry.id === selected);
	return (
		<>
			<Surface padding="xs">
				<List>
					{items.map((entry) => (
						<ListItem
							key={entry.id}
							title={entry.title}
							description={formatDate(entry.date)}
							trailing={
								<Badge
									label={
										!isNoticeActive(entry, today)
											? "Expired"
											: entry.dismissedBy?.includes(account.id)
												? "Dismissed"
												: "Active"
									}
									kind={
										entry.dismissedBy?.includes(account.id) ? "neutral" : "info"
									}
								/>
							}
							onPress={() => setSelected(entry.id)}
						/>
					))}
					{!items.length ? (
						<EmptyState
							title="No notices"
							description="Club updates will appear here when they’re published."
						/>
					) : undefined}
				</List>
			</Surface>
			{notice ? (
				<Dialog
					title={notice.title}
					isOpen
					onOpenChange={(open) => {
						if (!open) setSelected(undefined);
					}}
					footer={
						<Button
							label={
								notice.dismissedBy?.includes(account.id)
									? "Dismissed"
									: "Dismiss banner"
							}
							isDisabled={notice.dismissedBy?.includes(account.id)}
							isLoading={busy}
							onPress={() => {
								void dispatch({ type: "dismiss-notice", noticeId: notice.id });
							}}
						/>
					}
				>
					<Stack>
						<Text variant="caption" tone="secondary">
							{formatDate(notice.date)}
						</Text>
						<Text>{notice.body}</Text>
						{(account.admin ||
							account.coachPrograms.includes(notice.program)) &&
						isNoticeActive(notice, today) ? (
							<Button
								label="Expire notice now"
								variant="ghost"
								isDisabled={busy}
								onPress={(): void => {
									void dispatch({ type: "expire-notice", noticeId: notice.id });
								}}
							/>
						) : undefined}
					</Stack>
				</Dialog>
			) : undefined}
		</>
	);
};
export const NoticeList = (): ReactElement => {
	const { data } = useApp();
	return (
		<DataPage
			config={{
				query: api.pages.notices,
				args: {},
				preview: data.notices.toSorted((a, b) => b.date.localeCompare(a.date)),
				size: 20,
			}}
		>
			{(items) => <NoticeRows items={items} />}
		</DataPage>
	);
};
