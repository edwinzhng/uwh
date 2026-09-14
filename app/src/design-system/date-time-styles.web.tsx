import type { ReactElement } from "react";
import { useTheme } from "./theme";
import { control, corners, font, geometry, space, typography } from "./tokens";

export const DateTimeStyles = (): ReactElement => {
	const theme = useTheme();
	return (
		<style>{`
.club-date-popup { width:${geometry.calendarDay * 7 + space.xs * 2 + geometry.border * 2}px; padding:${space.xs}px; max-height:var(--available-height); overflow-y:auto; overscroll-behavior:contain; }
.club-date-entry { display:flex; flex-direction:column; gap:${space.xxs}px; margin-bottom:${space.xs}px; }
.club-date-entry .club-combo { width:100%; }
.club-picker-error { color:${theme.danger.foreground}; font-family:${font.regular}; font-size:${typography.caption.fontSize}px; line-height:${typography.caption.lineHeight}px; }
.club-combo[data-invalid] { border-color:${theme.danger.foreground}; }
.club-calendar { position:relative; width:100%; }
.club-calendar .rdp-month_caption { display:flex; align-items:center; min-height:${geometry.calendarDay}px; padding-right:${geometry.calendarDay * 2}px; font-family:${font.medium}; }
.club-calendar .rdp-nav { display:flex; position:absolute; top:0; right:0; }
.club-calendar .rdp-month_grid { width:100%; table-layout:fixed; border-collapse:collapse; }
.club-calendar .rdp-weekday { height:${geometry.compactControl}px; color:${theme.text.secondary}; font-family:${font.regular}; font-size:${typography.caption.fontSize}px; font-weight:400; text-align:center; }
.club-calendar .rdp-day { padding:0; text-align:center; }
.club-calendar .rdp-day_button, .club-calendar .rdp-button_previous, .club-calendar .rdp-button_next { box-sizing:border-box; display:flex; align-items:center; justify-content:center; width:${geometry.calendarDay}px; height:${geometry.calendarDay}px; max-width:100%; padding:0; margin:0; border:0; border-radius:${corners.control}px; background:transparent; color:${theme.text.primary}; font:inherit; cursor:pointer; }
.club-calendar .rdp-day_button { width:100%; font-variant-numeric:tabular-nums; }
.club-calendar button:hover:not(:disabled):not([aria-disabled="true"]), .club-calendar-shortcut:hover:not(:disabled) { background:${theme.background.secondary}; }
.club-calendar .rdp-outside .rdp-day_button { color:${theme.text.secondary}; }
.club-calendar .rdp-today .rdp-day_button { box-shadow:inset 0 0 0 ${geometry.border}px ${theme.controlBorder}; }
.club-calendar .rdp-selected .rdp-day_button { background:${theme.accent.background}; color:${theme.accent.foreground}; box-shadow:none; }
.club-calendar .rdp-selected .rdp-day_button:hover { background:${theme.accent.hover}; }
.club-calendar button:disabled, .club-calendar button[aria-disabled="true"], .club-calendar-shortcut:disabled { opacity:${geometry.disabledOpacity}; cursor:default; }
.club-calendar button:focus-visible, .club-calendar-shortcut:focus-visible { outline:${geometry.focus}px solid ${theme.focus}; outline-offset:-${geometry.focus}px; }
.club-calendar .rdp-chevron { fill:currentColor; }
.club-date-shortcuts { display:flex; flex-wrap:wrap; gap:${space.xxs}px; padding-top:${space.xs}px; margin-top:${space.xs}px; border-top:${geometry.border}px solid ${theme.border}; }
.club-calendar-shortcut { box-sizing:border-box; min-height:${control.height}px; padding:${control.paddingY}px ${control.paddingX}px; border:${geometry.border}px solid transparent; border-radius:${corners.control}px; background:transparent; color:${theme.text.secondary}; font-family:${font.medium}; font-size:${control.typography.fontSize}px; line-height:${control.typography.lineHeight}px; cursor:pointer; }
@media ${control.touchQuery} { .club-date-popup { width:${geometry.touch * 7 + space.xs * 2 + geometry.border * 2}px; } .club-calendar .rdp-day_button, .club-calendar .rdp-button_previous, .club-calendar .rdp-button_next, .club-calendar-shortcut { min-height:${geometry.touch}px; } .club-calendar .rdp-month_caption { min-height:${geometry.touch}px; } }
`}</style>
	);
};
