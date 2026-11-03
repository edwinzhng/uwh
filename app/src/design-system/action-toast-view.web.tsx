import type { ReactElement } from "react";
import { ToastCard } from "./toast-card";
import type { ToastViewProps } from "./toast-lifetime";

export const renderActionToast = (props: ToastViewProps): ReactElement => (
	<ToastCard
		copy={props.copy}
		kind={props.kind}
		startedAt={props.startedAt}
		duration={props.duration}
		onExpire={props.onExpire}
	/>
);
