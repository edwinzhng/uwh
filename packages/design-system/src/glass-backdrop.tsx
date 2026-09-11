"use client";
import type { ReactElement } from "react";
import { type GlassMaterial, materials } from "./materials";

export const GlassBackdrop = ({
	theme = "light",
	material = "floating",
}: {
	theme?: "light" | "dark";
	material?: GlassMaterial;
}): ReactElement => {
	const filter = `blur(${materials.blur.floating}px) saturate(${materials.saturation})`;
	return (
		<div
			aria-hidden
			style={{
				pointerEvents: "none",
				position: "absolute",
				inset: 0,
				borderRadius: "inherit",
				background: materials[theme][material],
				backdropFilter: filter,
				WebkitBackdropFilter: filter,
			}}
		/>
	);
};
