import { corners, geometry, space } from "./tokens";

export const interactiveRow = {
	gutter: space.xs,
	paddingHorizontal: space.sm,
	paddingVertical: space.xs,
	minHeight: geometry.touch,
	borderRadius: corners.control,
	focusOffset: -geometry.focus,
} as const;

type ListRowSpacing = {
	paddingHorizontal: number;
	paddingVertical: number;
	marginHorizontal: number;
};

export const listRowSpacing = ({
	interactive,
	hasLeading = false,
}: {
	interactive: boolean;
	flush?: boolean;
	cardRow?: boolean;
	hasLeading?: boolean;
}): ListRowSpacing =>
	interactive
		? {
				paddingHorizontal: interactiveRow.paddingHorizontal,
				paddingVertical: interactiveRow.paddingVertical,
				marginHorizontal: -interactiveRow.paddingHorizontal,
			}
		: {
				paddingHorizontal: space.none,
				paddingVertical: hasLeading ? space.xs : space.xxs,
				marginHorizontal: 0,
			};
