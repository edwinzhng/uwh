import type { ReactElement } from "react";
import { previewGlassColors, useGlassPreview } from "./glass-preview-context";
import { interactiveRow } from "./interactive-row-layout";
import { materialColors, materials } from "./materials";
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
	const treatment = useGlassPreview();
	const glass = previewGlassColors(theme.mode === "dark", treatment ?? "clear");
	const canAnimate = useMotion();
	const statusStyles = (["success", "warning", "danger", "pending"] as const)
		.map((tone): string => {
			const scale = theme.colorScales[tone];
			return `
.club-picker-trigger[data-tone="${tone}"] { background:${scale.subtle}; color:${scale.text}; border-color:${scale.border}; }
.club-picker-trigger[data-tone="${tone}"][data-popup-open] { background:${scale.muted}; }
@media (hover:hover) and (pointer:fine) { .club-picker-trigger[data-tone="${tone}"]:hover:not(:disabled) { background:${scale.muted}; } }
.club-popup-item[data-tone="${tone}"] { color:${scale.text}; }
.club-popup-item[data-tone="${tone}"][data-highlighted]:not([data-disabled]), .club-popup-item[data-tone="${tone}"][data-checked] { background:${scale.muted}; }
`;
		})
		.join("\n");
	return (
		<style>{`
[data-sonner-toast][data-type="success"] [data-icon] { color:${theme.success.foreground}; }
[data-sonner-toast][data-type="error"] [data-icon] { color:${theme.danger.foreground}; }
[data-sonner-toast][data-type="warning"] [data-icon] { color:${theme.warning.foreground}; }
[data-sonner-toast][data-type="info"] [data-icon] { color:${theme.accent.background}; }

[id^="floating-control-"] { position:relative; }
[id^="floating-control-"]::after { content:""; pointer-events:none; position:absolute; inset:0; border-radius:inherit; background:transparent; }
[id^="floating-control-"]:has([data-popup-open])::after { background:${colors.hover}; }
@media (hover:hover) and (pointer:fine) { [id^="floating-control-"]:has(button:hover)::after, [id^="floating-control-"]:has([role="button"]:hover)::after { background:${colors.hover}; } }
[id^="floating-control-"] button,
[id^="floating-control-"] [role="button"] { background:transparent !important; }

.club-picker-field { display:flex; flex-direction:column; align-items:flex-start; gap:${space.xs}px; min-width:0; max-width:100%; }
.club-picker-label { color:${theme.text.secondary}; font-family:${font.regular}; font-size:${typography.caption.fontSize}px; line-height:${typography.caption.lineHeight}px; }
.club-picker-trigger, .club-combo { box-sizing:border-box; display:flex; align-items:center; gap:${control.gap}px; min-height:${control.height}px; max-width:100%; padding:${control.paddingY}px ${control.paddingX}px; border:${geometry.border}px solid ${theme.controlBorder}; border-radius:${corners.control}px; background:${theme.background.primary}; color:${theme.text.primary}; font-family:${font.medium}; font-size:${control.typography.fontSize}px; line-height:${control.typography.lineHeight}px; }
.club-picker-trigger { cursor:pointer; }
.club-picker-trigger[data-icon] { justify-content:center; min-height:${geometry.touch}px; min-width:${geometry.touch}px; padding:${space.none}px; border-color:transparent; background:transparent; }
.club-picker-trigger[data-picker], .club-combo { width:${geometry.popupWidth}px; }
.club-picker-trigger[data-picker] { justify-content:space-between; }
[data-testid="club-filter-fields"] .club-picker-trigger[data-picker]:not([data-compact]), [role="dialog"] .club-picker-trigger[data-picker]:not([data-compact]), [role="dialog"] .club-combo { width:100%; }
.club-picker-trigger[data-picker][data-compact] { width:max-content; min-width:${geometry.touch}px; min-height:${geometry.compactControl}px; padding-block:${space.xxs}px; }
.club-picker-trigger[data-picker][data-appearance="context"] { width:auto; min-height:${geometry.touch}px; border-color:transparent; background:transparent; justify-content:flex-start; }
[role="dialog"] .club-picker-trigger[data-picker][data-appearance="context"] { width:auto; }
.club-picker-trigger[data-appearance="context"] .club-picker-value { white-space:normal; overflow-wrap:anywhere; }
.club-picker-trigger[data-appearance="context"][data-popup-open] { background:${theme.background.secondary}; }
.club-picker-trigger[data-appearance="context"]:active:not(:disabled) { background:${theme.background.pressed}; }
@media (hover:hover) and (pointer:fine) { .club-picker-trigger[data-appearance="context"]:hover:not(:disabled) { background:${theme.background.hover}; } }
.club-picker-trigger[data-popup-open] { background:${theme.background.secondary}; }
@media (hover:hover) and (pointer:fine) { .club-picker-trigger:hover:not(:disabled) { background:${theme.background.secondary}; } }
.club-picker-trigger:focus-visible, .club-combo:focus-within { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:${geometry.focus}px; }
.club-picker-trigger:disabled, .club-combo[data-disabled] { opacity:${geometry.disabledOpacity}; cursor:default; }
.club-picker-trigger svg, .club-popup svg, .club-combo svg { width:${geometry.iconSmall}px; height:${geometry.iconSmall}px; flex-shrink:0; }
.club-picker-value { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.club-picker-value[data-placeholder] { color:${theme.text.secondary}; }
.club-popup-positioner { z-index:${layer.popover}; outline:none; }
[data-club-popup-host] .club-popup-positioner { z-index:${layer.modal + layer.popover}; }
.club-popup { box-sizing:border-box; width:max(var(--anchor-width), ${geometry.popupWidth}px); max-width:var(--available-width); max-height:min(var(--available-height), ${geometry.popupMaxHeight}px); padding:${interactiveRow.gutter}px; border:${geometry.border}px solid ${glass.edge}; border-radius:${corners.menu}px; background:${glass.fill}; background-image:linear-gradient(135deg, ${glass.highlight}, transparent 45%, transparent 75%, ${glass.highlight}); backdrop-filter:blur(${materials.blur.floating}px) saturate(${materials.saturation}); -webkit-backdrop-filter:blur(${materials.blur.floating}px) saturate(${materials.saturation}); color:${theme.text.primary}; box-shadow:${glass.rim}, ${colors.shadow}; outline:none; overflow:hidden; font-family:${font.regular}; font-size:${typography.label.fontSize}px; line-height:${typography.label.lineHeight}px; transform-origin:var(--transform-origin); transition:opacity ${canAnimate ? motion.duration.fast : 0}ms, transform ${canAnimate ? motion.duration.fast : 0}ms cubic-bezier(${motion.easing.out.join(",")}); }
.club-popup[data-starting-style], .club-popup[data-ending-style] { opacity:0; transform:translateY(${canAnimate ? space.xxs : 0}px); }
@media (prefers-reduced-transparency:reduce) { .club-popup { background:${theme.background.primary}; backdrop-filter:none; -webkit-backdrop-filter:none; } }
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))) { .club-popup { background:${theme.background.primary}; } }
.club-popup-list { overflow-y:auto; overscroll-behavior:contain; max-height:min(calc(var(--available-height) - ${(interactiveRow.gutter + geometry.border) * 2}px), ${geometry.popupMaxHeight - (interactiveRow.gutter + geometry.border) * 2}px); outline:none; }
.club-menu-popup { overflow-y:auto; overscroll-behavior:contain; }
.club-popup-item { box-sizing:border-box; display:flex; align-items:center; gap:${space.xs}px; min-height:${interactiveRow.minHeight}px; padding:${interactiveRow.paddingVertical}px ${interactiveRow.paddingHorizontal}px; border-radius:${interactiveRow.borderRadius}px; outline:none; cursor:pointer; user-select:none; }
.club-popup-item:focus-visible:not([data-disabled]) { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:${interactiveRow.focusOffset}px; }
.club-popup-item[data-highlighted]:not([data-disabled]), .club-popup-item[data-checked] { background:${theme.background.hover}; }
.club-popup-item[data-disabled] { cursor:default; opacity:${geometry.disabledOpacity}; }
.club-popup-item[data-tone="danger"] { color:${theme.danger.foreground}; }
.club-popup-item[data-tone="danger"][data-highlighted] { background:${theme.danger.background}; }
.club-popup-item { position:relative; isolation:isolate; background:transparent !important; --row-highlight:${theme.background.hover}; }
.club-popup-item::before { content:""; position:absolute; inset:0; z-index:-1; pointer-events:none; border-radius:inherit; background:var(--row-highlight); opacity:0; transform:scale(${canAnimate ? 0.97 : 1}); transition:opacity ${canAnimate ? motion.duration.fast : motion.duration.instant}ms cubic-bezier(${motion.easing.out.join(",")}), transform ${canAnimate ? motion.duration.fast : motion.duration.instant}ms cubic-bezier(${motion.easing.out.join(",")}); }
.club-popup-item[data-highlighted]:not([data-disabled])::before, .club-popup-item[data-checked]:not([data-disabled])::before { opacity:1; transform:scale(1); }
${(["success", "warning", "danger", "pending"] as const).map((tone): string => `.club-popup-item[data-tone="${tone}"] { --row-highlight:${theme.colorScales[tone].muted}; }`).join("\n")}
.club-popup-item-label { display:block; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:${typography.label.lineHeight}px; }
.club-hover-surface { position:relative; isolation:isolate; min-width:0; }
.club-moving-highlight { position:absolute; left:0; top:0; pointer-events:none; opacity:0; z-index:-1; }
.club-hover-surface[data-shared-hover] .club-popup-item[data-highlighted]:not([data-checked])::before { opacity:0; }
.club-hover-surface[data-shared-hover] .club-popup-item { isolation:auto; }
.club-popup-indicator { display:flex; align-items:center; justify-content:center; min-width:${geometry.icon}px; margin-left:auto; }
.club-popup-group-label { padding:${interactiveRow.paddingVertical}px ${interactiveRow.paddingHorizontal}px; font-family:${font.medium}; font-size:${typography.caption.fontSize}px; color:${theme.text.secondary}; }
.club-popup-separator { height:${geometry.border}px; background:${theme.border}; margin:${space.xxs}px; }
.club-popup-empty { padding:${space.sm}px ${interactiveRow.paddingHorizontal}px; color:${theme.text.secondary}; }
.club-popup-empty:empty { display:none; }
.club-combo-input { box-sizing:border-box; width:100%; min-width:0; padding:0; border:0; background:transparent; color:${theme.text.primary}; font:inherit; font-family:${font.regular}; outline:none; }
.club-combo-input::placeholder { color:${theme.text.secondary}; }
.club-combo-actions { display:flex; align-items:center; gap:0; margin-block:${-(control.actionSize - control.typography.lineHeight) / 2}px; margin-right:${-(control.actionSize - control.icon) / 2}px; }
.club-combo-action { display:flex; flex-shrink:0; align-items:center; justify-content:center; width:${control.actionSize}px; height:${control.actionSize}px; padding:0; border:0; border-radius:${corners.item}px; color:${theme.text.secondary}; background:transparent; cursor:pointer; }
.club-message-reaction-trigger { width:${geometry.touch}px; height:${geometry.touch}px; border-radius:${corners.pill}px; }
.club-message-reaction-trigger[data-popup-open] { background:${theme.background.hover}; }
.club-reaction-popup { padding:${space.xs}px; }
.club-reaction-quick { border-radius:${corners.pill}px; width:max-content; max-width:calc(100vw - ${space.sm * 2}px); }
.club-quick-reactions { display:flex; align-items:center; }
.club-quick-reaction { box-sizing:border-box; width:${geometry.touch}px; height:${geometry.touch}px; display:flex; align-items:center; justify-content:center; padding:0; border:0; border-radius:${corners.pill}px; background:transparent; color:${theme.text.primary}; cursor:pointer; }
.club-quick-reaction span { display:block; pointer-events:none; font-size:${typography.h1.fontSize}px; line-height:${geometry.touch}px; }
.club-quick-reaction[aria-pressed="true"] { background:${theme.colorScales.accent.muted}; }
.club-quick-reaction:focus-visible { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:-${geometry.focus}px; }
.club-quick-reaction:disabled { opacity:${geometry.disabledOpacity}; cursor:default; }
.club-reaction-full { box-sizing:border-box; width:min(${geometry.touch * 7 + space.xs * 2}px, calc(100vw - ${space.sm * 2}px)); height:min(${geometry.popupMaxHeight + geometry.touch * 3}px, var(--available-height)); max-height:var(--available-height); display:flex; flex-direction:column; overflow:hidden; border-radius:${corners.panel}px; }
.club-reaction-error { margin:${space.xxs}px ${space.xs}px; color:${theme.danger.foreground}; font-size:${typography.caption.fontSize}px; }
@media (hover:hover) and (pointer:fine) {
 .club-message-reaction-trigger { opacity:0; pointer-events:none; }
 .club-message-row:hover .club-message-reaction-trigger, .club-message-row:focus-within .club-message-reaction-trigger, .club-message-reaction-trigger[data-popup-open] { opacity:1; pointer-events:auto; }
}
.club-message-context { outline:none; }
.club-message-context:focus-visible { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:-${geometry.focus}px; border-radius:${corners.item}px; }
.club-message-menu-trigger { width:${geometry.touch}px; height:${geometry.touch}px; opacity:0; pointer-events:none; }
.club-message-menu-trigger:focus-visible, .club-message-menu-trigger[aria-expanded="true"] { opacity:1; pointer-events:auto; }
@media (hover:hover) and (pointer:fine) { .club-message-row:hover .club-message-menu-position[data-separate] .club-message-menu-trigger, .club-message-menu-position[data-separate]:focus-within .club-message-menu-trigger { opacity:1; pointer-events:auto; } }
@media (hover:hover) and (pointer:fine) { .club-combo-action:hover:not(:disabled) { background:${theme.background.secondary}; } }
@media (hover:hover) and (pointer:fine) { .club-message-reaction-trigger:hover:not(:disabled) { background:${theme.background.hover}; } }
.club-combo-action:focus-visible { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:-${geometry.focus}px; }
@media ${control.touchQuery} { .club-picker-trigger, .club-picker-trigger[data-picker][data-compact], .club-combo, .club-popup-item { min-height:${geometry.touch}px; } .club-combo-action { width:${geometry.touch}px; height:${geometry.touch}px; } .club-combo-actions { margin-block:${-(geometry.touch - control.typography.lineHeight) / 2}px; margin-right:${-(geometry.touch - control.icon) / 2}px; } }
.club-combo-action.club-reaction-trigger { position:relative; width:${typography.caption.lineHeight}px; height:${typography.caption.lineHeight}px; line-height:${typography.caption.lineHeight}px; }
.club-reaction-trigger::after { content:""; position:absolute; inset:${-(control.actionSize - typography.caption.lineHeight) / 2}px; }
@media ${control.touchQuery} { .club-reaction-trigger::after { inset:${-(geometry.touch - typography.caption.lineHeight) / 2}px; } }
.club-person-trigger { box-sizing:border-box; display:flex; align-items:center; min-height:${geometry.touch}px; border:0; padding:${interactiveRow.paddingVertical}px ${interactiveRow.paddingHorizontal}px; border-radius:${corners.control}px; background:transparent; cursor:pointer; color:${theme.text.primary}; }
@media (min-width:${geometry.wide}px) { .club-person-trigger { width:100%; text-align:left; } }
.club-person-trigger[data-popup-open] { background:${theme.background.hover}; }
@media (hover:hover) and (pointer:fine) { .club-person-trigger:hover { background:${theme.background.hover}; } }
.club-person-trigger:focus-visible { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:${space.half}px; }
@media (hover:hover) and (pointer:fine) { .club-checkbox-row:hover:not([data-disabled]) { background:${theme.background.hover}; } }
.club-checkbox-row:has(input:focus-visible) { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:${interactiveRow.focusOffset}px; }
.club-checkbox-row > span { flex:1; min-width:0; overflow-wrap:anywhere; }
${statusStyles}
@media (prefers-reduced-motion:reduce) { .club-popup, .club-popup-item::before { transition:none; } .club-popup-item::before { transform:none; } }
`}</style>
	);
};
