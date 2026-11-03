import { createContext, useContext } from "react";

export const PickerSizingContext = createContext(false);

export const usePickerSizing = (): boolean => useContext(PickerSizingContext);
