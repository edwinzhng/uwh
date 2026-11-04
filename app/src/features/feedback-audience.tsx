import { useQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { memberName } from "../domain/app-rules";
import { feedbackAudienceNames } from "../domain/feedback-audience";

type Props = {
	personId: string;
	enabled: boolean;
	children: (names: string[] | undefined) => ReactElement;
};
const LiveAudience = ({ personId, enabled, children }: Props): ReactElement =>
	children(
		useQuery(api.pages.feedbackAudience, enabled ? { personId } : "skip"),
	);
export const FeedbackAudience = (props: Props): ReactElement => {
	const { source, accounts, data } = useApp();
	return source === "convex" ? (
		<LiveAudience personId={props.personId} enabled={props.enabled}>
			{props.children}
		</LiveAudience>
	) : (
		props.children(
			feedbackAudienceNames(
				accounts,
				props.personId,
				memberName(data, props.personId),
			),
		)
	);
};
