import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { messageMenuOffset } from "./message-bubble-layout";
import { geometry } from "./tokens";

export const MessageMenuPosition = ({
	children,
	outgoing,
	separate,
}: {
	children: ReactNode;
	outgoing: boolean;
	separate: boolean;
}): ReactElement => (
	<View
		pointerEvents="box-none"
		style={{
			position: "absolute",
			top: 0,
			left: outgoing ? messageMenuOffset(separate) : undefined,
			right: outgoing ? undefined : messageMenuOffset(separate),
			width: geometry.touch,
			height: geometry.touch,
		}}
	>
		{children}
	</View>
);
