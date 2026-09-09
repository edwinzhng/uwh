import type { ReactElement } from "react";
import { materialColors } from "./materials";
import { useTheme } from "./theme";
import {
	control,
	corners,
	font,
	geometry,
	layer,
	motion,
	space,
	typography,
} from "./tokens";
import { useMotion } from "./use-motion";

export const PopupStyles = (): ReactElement => {
	const theme = useTheme();
	const colors = materialColors(theme);
	const canAnimate = useMotion();
	const statusStyles = (["success", "warning", "danger"] as const)
		.map((tone): string => {
			const scale = theme.colorScales[tone];
			return `
.club-picker-trigger[data-tone="${tone}"] { background:${scale.subtle}; color:${scale.text}; border-color:${scale.border}; }
.club-picker-trigger[data-tone="${tone}"]:hover:not(:disabled), .club-picker-trigger[data-tone="${tone}"][data-popup-open] { background:${scale.muted}; }
.club-popup-item[data-tone="${tone}"] { color:${scale.text}; }
.club-popup-item[data-tone="${tone}"][data-highlighted]:not([data-disabled]), .club-popup-item[data-tone="${tone}"][data-checked] { background:${scale.muted}; }
`;
		})
		.join("\n");
	return (
		<style>{`
.club-picker-field { display:flex; flex-direction:column; align-items:flex-start; gap:${space.xs}px; min-width:0; max-width:100%; }
.club-picker-label { color:${theme.text.secondary}; font-family:${font.regular}; font-size:${typography.caption.fontSize}px; line-height:${typography.caption.lineHeight}px; }
.club-picker-trigger, .club-combo { box-sizing:border-box; display:flex; align-items:center; gap:${control.gap}px; min-height:${control.height}px; max-width:100%; padding:${control.paddingY}px ${control.paddingX}px; border:${geometry.border}px solid ${theme.border}; border-radius:${corners.control}px; background:${theme.background.primary}; color:${theme.text.primary}; font-family:${font.medium}; font-size:${control.typography.fontSize}px; line-height:${control.typography.lineHeight}px; }
.club-picker-trigger { cursor:pointer; }
.club-picker-trigger[data-icon] { justify-content:center; padding-inline:${space.xs}px; }
.club-picker-trigger[data-picker], .club-combo { width:${geometry.popupWidth}px; }
.club-picker-trigger[data-picker] { justify-content:space-between; }
.club-picker-trigger:hover:not(:disabled), .club-picker-trigger[data-popup-open] { background:${theme.background.secondary}; }
.club-picker-trigger:focus-visible, .club-combo:focus-within { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:${geometry.focus}px; }
.club-picker-trigger:disabled, .club-combo[data-disabled] { opacity:${geometry.disabledOpacity}; cursor:default; }
.club-picker-trigger svg, .club-popup svg, .club-combo svg { width:${geometry.iconSmall}px; height:${geometry.iconSmall}px; flex-shrink:0; }
.club-picker-value { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.club-picker-value[data-placeholder] { color:${theme.text.secondary}; }
.club-popup-positioner { z-index:${layer.popover}; outline:none; }
[data-club-popup-host] .club-popup-positioner { z-index:${layer.modal + layer.popover}; }
.club-popup { box-sizing:border-box; width:max(var(--anchor-width), ${geometry.popupWidth}px); max-width:var(--available-width); max-height:min(var(--available-height), ${geometry.popupMaxHeight}px); padding:${space.xxs}px; border:${geometry.border}px solid ${theme.border}; border-radius:${corners.overlay}px; background:${theme.background.primary}; color:${theme.text.primary}; box-shadow:${colors.shadow}; outline:none; overflow:hidden; font-family:${font.regular}; font-size:${typography.label.fontSize}px; line-height:${typography.label.lineHeight}px; transform-origin:var(--transform-origin); transition:opacity ${canAnimate ? motion.duration.fast : 0}ms, transform ${canAnimate ? motion.duration.fast : 0}ms cubic-bezier(${motion.easing.out.join(",")}); }
.club-popup[data-starting-style], .club-popup[data-ending-style] { opacity:0; transform:translateY(${canAnimate ? space.xxs : 0}px); }
.club-popup-list { overflow-y:auto; overscroll-behavior:contain; max-height:min(calc(var(--available-height) - ${space.xs}px), ${geometry.popupMaxHeight - space.xs}px); outline:none; }
.club-menu-popup { overflow-y:auto; overscroll-behavior:contain; }
.club-popup-item { box-sizing:border-box; display:flex; align-items:center; gap:${space.xs}px; min-height:${geometry.compactControl}px; padding:${space.xxs}px ${space.xs}px; border-radius:${corners.item}px; outline:none; cursor:default; user-select:none; }
.club-popup-item[data-highlighted]:not([data-disabled]), .club-popup-item[data-checked] { background:${theme.background.hover}; }
.club-popup-item[data-disabled] { opacity:${geometry.disabledOpacity}; }
.club-popup-item[data-tone="danger"] { color:${theme.danger.foreground}; }
.club-popup-item[data-tone="danger"][data-highlighted] { background:${theme.danger.background}; }
.club-popup-item-label { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.club-popup-indicator { display:flex; align-items:center; margin-left:auto; }
.club-popup-group-label { padding:${space.xxs}px ${space.xs}px; font-family:${font.medium}; font-size:${typography.caption.fontSize}px; color:${theme.text.secondary}; }
.club-popup-separator { height:${geometry.border}px; background:${theme.border}; margin:${space.xxs}px; }
.club-popup-empty { padding:${space.sm}px ${space.xs}px; color:${theme.text.secondary}; }
.club-popup-empty:empty { display:none; }
.club-combo-input { box-sizing:border-box; width:100%; min-width:0; padding:0; border:0; background:transparent; color:${theme.text.primary}; font:inherit; font-family:${font.regular}; outline:none; }
.club-combo-input::placeholder { color:${theme.text.secondary}; }
.club-combo-actions { display:flex; align-items:center; gap:0; margin-block:${-(control.actionSize - control.typography.lineHeight) / 2}px; margin-right:${-(control.actionSize - control.icon) / 2}px; }
.club-combo-action { display:flex; flex-shrink:0; align-items:center; justify-content:center; width:${control.actionSize}px; height:${control.actionSize}px; padding:0; border:0; border-radius:${corners.item}px; color:${theme.text.secondary}; background:transparent; cursor:pointer; }
.club-combo-action:hover:not(:disabled) { background:${theme.background.secondary}; }
.club-combo-action:focus-visible { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:-${geometry.focus}px; }
@media ${control.touchQuery} { .club-picker-trigger, .club-combo, .club-popup-item { min-height:${geometry.touch}px; } .club-combo-action { width:${geometry.touch}px; height:${geometry.touch}px; } .club-combo-actions { margin-block:${-(geometry.touch - control.typography.lineHeight) / 2}px; margin-right:${-(geometry.touch - control.icon) / 2}px; } }
.club-person-trigger { border:0; padding:${space.xxs}px; border-radius:${corners.control}px; background:transparent; cursor:pointer; color:${theme.text.primary}; }
.club-person-trigger:hover, .club-person-trigger[data-popup-open] { background:${theme.background.hover}; }
.club-person-trigger:focus-visible { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:${space.half}px; }
.club-person-option { cursor:pointer; padding:${space.xs}px; }
${statusStyles}
@media (prefers-reduced-motion:reduce) { .club-popup { transition:none; } }
`}</style>
	);
};
