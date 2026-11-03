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
	flush = false,
	cardRow = false,
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
				marginHorizontal: cardRow
					? interactiveRow.gutter - space.md
					: interactiveRow.gutter,
			}
		: {
				paddingHorizontal: cardRow ? space.md : flush ? space.none : space.sm,
				paddingVertical: hasLeading ? space.xs : space.xxs,
				marginHorizontal: cardRow ? -space.md : 0,
			};
