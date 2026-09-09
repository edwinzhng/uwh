import { createContext, useContext } from "react";

export const PopupContainerContext = createContext<HTMLElement | undefined>(
	undefined,
);
export const usePopupContainer = (): HTMLElement | undefined =>
	useContext(PopupContainerContext);
