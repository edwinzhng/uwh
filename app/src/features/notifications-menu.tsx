import { useRouter } from "expo-router";
import { type ReactElement, useEffect, useRef, useState } from "react";
import {
	type InboxState,
	useLiveInbox,
	usePreviewInbox,
} from "../backend/use-inbox";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	InfiniteScroll,
	List,
	LoadingContent,
	NotificationBell,
	Row,
	Stack,
	Text,
} from "../design-system";
import { inboxRoute } from "../domain/inbox";
import { InboxRow } from "./inbox-row";
import { useFormTask } from "./use-form-task";
import { useReviewFlow } from "./use-review-flow";

type Props = { labeled?: boolean };
type WorkspaceProps = Props & {
	open: boolean;
	setOpen: (open: boolean) => void;
};
const InboxContent = ({
	labeled,
	open,
	setOpen,
	state,
}: WorkspaceProps & { state: InboxState }): ReactElement => {
	const router = useRouter();
	const task = useFormTask();
	const marked = useRef(false);
	const [showPast, setShowPast] = useState(false);
	const [openedUnreadIds, setOpenedUnreadIds] = useState<readonly string[]>([]);
	const currentItems = useRef(state.items);
	currentItems.current = state.items;
	const markAll = useRef(state.markAll);
	markAll.current = state.markAll;
	const [readError, setReadError] = useState<string>();
	useEffect((): void => {
		if (!open) {
			marked.current = false;
			setShowPast(false);
			setOpenedUnreadIds([]);
			return;
		}
		if (state.loading || marked.current) return;
		marked.current = true;
		setOpenedUnreadIds(
			currentItems.current
				.filter((item) => !item.readAt)
				.map((item) => item.id),
		);
		setReadError(undefined);
		void markAll.current().catch((): void => {
			setReadError("Couldn’t mark notifications as read.");
		});
	}, [open, state.loading]);

	const items = state.items.filter(
		(item) => showPast || !item.readAt || openedUnreadIds.includes(item.id),
	);
	return (
		<>
			<NotificationBell
				label={labeled ? "Notifications" : undefined}
				count={state.unreadCount}
				countIsLimited={state.unreadLimited}
				onPress={(): void => {
					task.clear();
					setOpen(true);
				}}
			/>
			<Dialog
				intent="picker"
				isDismissDisabled={task.busy}
				title="Notifications"
				isOpen={open}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
			>
				<Stack>
					{task.error || readError ? (
						<Text variant="small" tone="danger">
							{task.error ?? readError}
						</Text>
					) : undefined}
					<List gap="none">
						{state.loading ? (
							<LoadingContent />
						) : items.length ? (
							items.map((item) => (
								<InboxRow
									key={item.id}
									item={item}
									busy={task.busy}
									onOpen={(): void => {
										void task.run(async (): Promise<void> => {
											const target = await state.open(item.id);
											setOpen(false);
											router.push(inboxRoute(target));
										});
									}}
								/>
							))
						) : (
							<Stack gap="md" padding="lg">
								<Text align="center" weight="medium">
									{showPast ? "No past notifications." : "All caught up"}
								</Text>
								{!showPast ? (
									<Row justify="center">
										<Button
											label="Past notifications"
											variant="secondary"
											compact
											onPress={(): void => setShowPast(true)}
										/>
									</Row>
								) : undefined}
							</Stack>
						)}
					</List>
					{state.loadMore || state.loadingMore ? (
						<Row justify="start">
							<InfiniteScroll
								loadMore={state.loadMore}
								loading={state.loadingMore}
								revision={state.items.length}
								disabled={task.busy}
							/>
						</Row>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
const LiveInbox = (props: WorkspaceProps): ReactElement => (
	<InboxContent
		labeled={props.labeled}
		open={props.open}
		setOpen={props.setOpen}
		state={useLiveInbox(props.open, false)}
	/>
);
const PreviewInbox = (props: WorkspaceProps): ReactElement => (
	<InboxContent
		labeled={props.labeled}
		open={props.open}
		setOpen={props.setOpen}
		state={usePreviewInbox(false)}
	/>
);
export const NotificationsMenu = (props: Props): ReactElement => {
	const { source, account } = useApp();
	const reviewFlow = useReviewFlow();
	const [open, setOpen] = useState(
		reviewFlow === "notifications" || reviewFlow === "notifications-unread",
	);
	return source === "convex" ? (
		<LiveInbox
			key={account.id}
			labeled={props.labeled}
			open={open}
			setOpen={setOpen}
		/>
	) : (
		<PreviewInbox
			key={account.id}
			labeled={props.labeled}
			open={open}
			setOpen={setOpen}
		/>
	);
};
