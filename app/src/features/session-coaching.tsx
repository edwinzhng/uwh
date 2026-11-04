import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { RoleLabel, RoleScope, Row, Stack } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { EventCoaches } from "./event-coaches";
import { SessionGuestManager } from "./session-guest-manager";
import { SessionPlanSection } from "./session-plan-section";
import { SessionPlayerFeedback } from "./session-player-feedback";
import { SessionSeriesLink } from "./session-series-link";
import { TeamPanel } from "./team-panel";

export const SessionCoaching = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { account } = useApp();
	return (
		<RoleScope>
			<Stack gap="xl">
				<Row justify="between" wrap>
					<RoleLabel roleKind="coach" />
					{account.admin && event.seriesId ? (
						<RoleScope tone="admin">
							<SessionGuestManager event={event} />
						</RoleScope>
					) : undefined}
					{event.seriesId ? (
						<SessionSeriesLink seriesId={event.seriesId} />
					) : undefined}
				</Row>
				<EventCoaches event={event} />
				<Stack gap="sm">
					<SessionPlanSection key={event.id} event={event} />
				</Stack>
				<TeamPanel event={event} />
				<SessionPlayerFeedback event={event} />
			</Stack>
		</RoleScope>
	);
};
