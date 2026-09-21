import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { EmptyState, Row, Stack, Surface, Text } from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { Notice } from "../domain/app-types";
import { ConfirmButton } from "./confirm-button";

export const NoticeList = ({
	notices,
	manageable = false,
}: {
	notices: Notice[];
	manageable?: boolean;
}): ReactElement => {
	const { account, data, dispatch, busy } = useApp();
	return notices.length ? (
		<Stack gap="sm">
			{notices.map((notice) => {
				const canExpire = manageable && account.admin;
				return (
					<Surface key={notice.id}>
						<Stack gap="sm">
							<Text variant="caption" tone="secondary">
								Posted{" "}
								{notice.postedAt !== undefined
									? new Date(notice.postedAt).toLocaleString("en-CA", {
											month: "short",
											day: "numeric",
											year: "numeric",
											hour: "numeric",
											minute: "2-digit",
											timeZone: data.timeZone,
										})
									: formatDate(notice.date)}
							</Text>
							<Text>{notice.body}</Text>
							{canExpire ? (
								<Row justify="end">
									<ConfirmButton
										label="End now"
										variant="ghost"
										title="End this announcement?"
										description="This removes the announcement from the player view immediately."
										confirmLabel="End announcement"
										danger
										isDisabled={busy}
										onConfirm={async (): Promise<void> => {
											await dispatch({
												type: "expire-notice",
												noticeId: notice.id,
											});
										}}
									/>
								</Row>
							) : undefined}
						</Stack>
					</Surface>
				);
			})}
		</Stack>
	) : (
		<EmptyState
			title="No live announcements"
			description="New club announcements will appear here."
		/>
	);
};
