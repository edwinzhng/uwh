import {
	Children,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useState,
} from "react";
import { useWindowDimensions, View } from "react-native";
import {
	CategoryGridItem,
	type CategoryGridItemProps,
} from "./category-grid-item";
import { categoryGridColumns } from "./category-grid-model";
import { space } from "./tokens";

export const CategoryGrid = ({
	children,
	minimumCardWidth,
}: {
	children: ReactNode;
	minimumCardWidth?: number;
}): ReactElement => {
	const { fontScale } = useWindowDimensions();
	const [width, setWidth] = useState(0);
	const columns = categoryGridColumns(width, fontScale, minimumCardWidth);
	return (
		<View
			onLayout={(event): void => setWidth(event.nativeEvent.layout.width)}
			style={{
				flexDirection: "row",
				flexWrap: "wrap",
				gap: space.sm,
				alignItems: "stretch",
				minWidth: 0,
			}}
		>
			{Children.map(children, (child) => (
				<View
					style={{
						width:
							width > 0 &&
							!(
								isValidElement<CategoryGridItemProps>(child) &&
								child.type === CategoryGridItem &&
								child.props.fullWidth
							)
								? (width - space.sm * (columns - 1)) / columns
								: "100%",
						minWidth: 0,
					}}
				>
					{child}
				</View>
			))}
		</View>
	);
};
