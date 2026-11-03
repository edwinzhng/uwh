import { geometry, space } from "./tokens";

export const showMessageReaction = (
	menuFocused: boolean,
	separateMenu: boolean,
): boolean => !menuFocused || separateMenu;

export const messageMenuOffset = (separate: boolean): number =>
	-(separate ? geometry.touch * 2 + space.xs * 2 : geometry.touch + space.xxs);

export const messageBubbleLayout = (
	availableWidth: number,
	hasReaction: boolean,
): { maxWidth: number | undefined; separateMenu: boolean } => {
	const separateMenu = hasReaction && availableWidth >= geometry.narrow;
	const controlSpace = hasReaction
		? separateMenu
			? -messageMenuOffset(true)
			: geometry.touch + space.xxs
		: 0;
	const maxWidth =
		availableWidth > 0
			? Math.max(
					0,
					Math.min(availableWidth * 0.84, availableWidth - controlSpace),
				)
			: undefined;
	return {
		maxWidth,
		separateMenu,
	};
};
