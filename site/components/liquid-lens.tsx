"use client";
import { LiquidLens as SharedLiquidLens } from "@calgarycrocs/design-system/liquid-lens";
import type { ReactElement } from "react";
export const LiquidLens = (): ReactElement => (
	<SharedLiquidLens
		imageSrc="/hockey-action.webp"
		areaSelector=".hero"
		className="liquid-canvas"
	/>
);
