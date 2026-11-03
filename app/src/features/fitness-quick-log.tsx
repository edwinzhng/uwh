import type { ReactElement } from "react";
import { FitnessLogData } from "../backend/fitness-log-data";
import { Dialog, LoadingContent } from "../design-system";
import { FitnessQuickLogForm } from "./fitness-quick-log-form";
import { useClubToday } from "./use-club-today";
export const FitnessQuickLog = ({
	eventId,
	onClose,
}: {
	eventId?: string;
	onClose: () => void;
}): ReactElement => (
	<FitnessLogData date={useClubToday()} eventId={eventId}>
		{(context) =>
			context ? (
				<FitnessQuickLogForm
					eventId={eventId}
					onClose={onClose}
					context={context}
				/>
			) : (
				<Dialog
					intent="form"
					title="Log swim results"
					isOpen
					onOpenChange={(open): void => {
						if (!open) onClose();
					}}
				>
					<LoadingContent />
				</Dialog>
			)
		}
	</FitnessLogData>
);
