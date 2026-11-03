import { Children, type ReactElement, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { PickerSizingContext } from "./picker-layout-context";
import { geometry, space } from "./tokens";

export const FilterFields = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const { fontScale } = useWindowDimensions();
	return (
		<PickerSizingContext value={true}>
			<View
				testID="club-filter-fields"
				style={{
					flexDirection: "row",
					flexWrap: "wrap",
					gap: space.sm,
					minWidth: 0,
				}}
			>
				{Children.toArray(children).map((child, index) => (
					<View
						key={
							typeof child === "object" && "key" in child ? child.key : index
						}
						style={{
							flexGrow: 1,
							flexBasis:
								fontScale >= 1.4
									? geometry.popupWidth
									: geometry.compactPickerWidth - space.sm,
							minWidth: 0,
						}}
					>
						{child}
					</View>
				))}
			</View>
		</PickerSizingContext>
	);
};
