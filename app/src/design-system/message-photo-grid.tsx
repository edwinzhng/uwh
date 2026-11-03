import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { geometry, space } from "./tokens";

export const MessagePhotoGrid = ({
	items,
}: {
	items: { id: string; content: ReactNode }[];
}): ReactElement | undefined =>
	items.length ? (
		<View
			style={{
				width: geometry.messageImage,
				maxWidth: "100%",
				flexDirection: "row",
				flexWrap: "wrap",
			}}
		>
			{items.map((item) => (
				<View
					key={item.id}
					style={{
						width: items.length === 1 ? "100%" : "50%",
						padding: space.half,
					}}
				>
					{item.content}
				</View>
			))}
		</View>
	) : undefined;
