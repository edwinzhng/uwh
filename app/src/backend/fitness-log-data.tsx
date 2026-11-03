import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import type { ClubEvent, Member } from "../domain/app-types";
export type FitnessLogContext = {
	practices: ClubEvent[];
	members: Member[];
	limited: boolean;
};
type Props = {
	eventId?: string;
	date: string;
	children: (context?: FitnessLogContext) => ReactNode;
};
const LiveFitnessLogData = ({ eventId, date, children }: Props): ReactNode =>
	children(useQuery(api.fitness.logContext, { eventId, date }));
export const FitnessLogData = ({
	eventId,
	date,
	children,
}: Props): ReactNode => {
	const { source, data } = useApp();
	return source === "convex" ? (
		<LiveFitnessLogData eventId={eventId} date={date}>
			{children}
		</LiveFitnessLogData>
	) : (
		children({
			practices: data.events,
			members: data.members,
			limited: false,
		})
	);
};
