import { type ReactElement, useLayoutEffect, useState } from "react";
import { DialogContent, type DialogProps } from "./dialog-content";

export const Dialog = (props: DialogProps): ReactElement | undefined => {
	const [retained, setRetained] = useState(props.isOpen);
	useLayoutEffect((): void => {
		if (props.isOpen) setRetained(true);
	}, [props.isOpen]);
	if (!props.isOpen && !retained) return undefined;
	return (
		<DialogContent
			{...props}
			onAfterClose={(): void => {
				setRetained(false);
				props.onAfterClose?.();
			}}
		/>
	);
};
