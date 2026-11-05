import { createContext, useContext } from "react";

export const MotionContext = createContext(false);
export const MotionSettingsReadyContext = createContext(true);
export const useMotion = (): boolean => useContext(MotionContext);
