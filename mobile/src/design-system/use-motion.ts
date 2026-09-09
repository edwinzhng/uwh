import { createContext, useContext } from "react";

export const MotionContext = createContext(false);
export const useMotion = (): boolean => useContext(MotionContext);
