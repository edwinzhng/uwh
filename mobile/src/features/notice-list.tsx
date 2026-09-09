import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Dialog,
	ListItem,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { Notice } from "../domain/app-types";
import { DataPage } from "./data-page";

const NoticeRows = ({ items }: { items: Notice[] }): ReactElement => {
	const { account, dispatch, busy } = useApp();
	const [selected, setSelected] = useState<string>();
	const notice = items.find((entry) => entry.id === selected);
	return (
		<>
			<Surface padding="xs">
				<Stack gap="xs">
					{items.map((entry) => (
						<ListItem
							key={entry.id}
							title={entry.title}
							description={formatDate(entry.date)}
							trailing={
								<Badge
									label={
										entry.acknowledgedBy.includes(account.id) ? "Read" : "New"
									}
									kind={
										entry.acknowledgedBy.includes(account.id)
											? "neutral"
											: "info"
									}
								/>
							}
							onPress={() => setSelected(entry.id)}
						/>
					))}
					{!items.length ? (
						<Text variant="small" tone="secondary">
							No notices
						</Text>
					) : undefined}
				</Stack>
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
								notice.acknowledgedBy.includes(account.id)
									? "Acknowledged"
									: "Acknowledge"
							}
							isDisabled={notice.acknowledgedBy.includes(account.id)}
							isLoading={busy}
							onPress={() => {
								void dispatch({ type: "acknowledge", noticeId: notice.id });
							}}
						/>
					}
				>
					<Stack>
						<Text variant="caption" tone="secondary">
							{formatDate(notice.date)}
						</Text>
						<Text>{notice.body}</Text>
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
