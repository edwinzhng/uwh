import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import { ActionMenu, Row, Stack, Surface, Text } from "../design-system";
import type { Notice } from "../domain/app-types";
import { displayDate, displayDateTime } from "../domain/date-display";
import { programName } from "../domain/programs";
import { ConfirmationDialog } from "./confirmation-dialog";
import { ContentReport } from "./content-report";

export const NoticeCard = ({
	notice,
	manageable,
	onEdit,
}: {
	notice: Notice;
	manageable: boolean;
	onEdit: (notice: Notice) => void;
}): ReactElement => {
	const { data, dispatch } = useApp();
	const { busy } = useAppStatus();
	const [ending, setEnding] = useState(false);
	return (
		<>
			<Surface variant="plain">
				<Stack gap="sm">
					<Row justify="between">
						<Stack gap="none" grow>
							<Text variant="caption" tone="secondary">
								{programName(data, notice.program)}
							</Text>
							<Text variant="caption" tone="secondary">
								{notice.postedAt !== undefined
									? displayDateTime(notice.postedAt, data.timeZone)
									: displayDate(notice.date)}
							</Text>
						</Stack>
						{manageable ? (
							<ActionMenu
								label="Announcement options"
								icon="more"
								isDisabled={busy}
								groups={[
									{
										id: "announcement",
										items: [
											{
												id: "edit",
												label: "Edit",
												icon: "edit",
												onSelect: (): void => onEdit(notice),
											},
										],
									},
									{
										id: "end",
										items: [
											{
												id: "end",
												label: "End",
												icon: "stop",
												tone: "danger",
												onSelect: (): void => setEnding(true),
											},
										],
									},
								]}
							/>
						) : undefined}
					</Row>
					<Text>{notice.body}</Text>
					<ContentReport
						source={{ kind: "notice", id: notice.id }}
						label="Report announcement"
					/>
				</Stack>
			</Surface>
			{ending ? (
				<ConfirmationDialog
					title="End announcement?"
					description="This removes it from the live feed and banners. Its history is preserved."
					confirmLabel="End announcement"
					danger
					isDisabled={!manageable}
					onClose={(): void => setEnding(false)}
					onConfirm={async (): Promise<void> => {
						const saved = await dispatch({
							type: "expire-notice",
							noticeId: notice.id,
						});
						if (!saved)
							throw new Error("Couldn’t end this announcement. Try again.");
					}}
				/>
			) : undefined}
		</>
	);
};
