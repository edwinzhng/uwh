# Crocs design system

`Calendar` provides a month grid with event markers, Today and month navigation. Day buttons expose full dates and event counts; the web adapter uses a single tab stop with arrow, Home/End and Page Up/Down navigation. `SegmentedControl.hideLabel` hides redundant visible headings while retaining the accessible group name. `Button.accessibilityLabel` adds player/event context to short visible action labels without changing approved control geometry.

## Surfaces and floating navigation

`Surface` provides opaque primary/secondary backgrounds, token padding, borders and shared corners. The page canvas uses the primary background (white in light mode), while the desktop sidebar and secondary controls use the subtly tinted secondary background. Borders and spacing separate sections. Pages, cards, messages, menus and dialogs use solid neutral surfaces. Glass is reserved for the floating bottom navigation. `GlassPanel` exposes only the `floating` material, with `panel`/`pill` shapes and token padding. Web uses backdrop blur and saturation with a restrained diagonal highlight. iOS uses Expo BlurView; Android currently uses a translucent fallback. Native rendering and performance still need device review.

`AppLayout` owns the responsive sidebar and safe-area spacing, with the profile menu at the top left and notifications at the right. Detail pages place a content-width ghost back button above the title, aligning its arrow with the title’s leading edge. Account settings lives in the profile menu, without a separate navigation button. A root `NavigationFrame` keeps the mobile tab bar mounted across route changes. Feature code composes `Surface` and `ListItem` through the public API. Existing button/field/segment geometry remains unchanged.

Floating glass uses a 12% white tint in light mode, 12px web blur, directional highlights and a reflective rim. Its selected tab uses a translucent accent lens; hover also stays translucent. The selection shares the existing 220ms movement without adding another blur layer. Ordinary segmented controls retain their solid selection. Page headings reserve enough width to wrap toolbar actions below the title on phones.

Navigation centers the icon/label group vertically within each tab, with equal top/bottom spacing. The sliding and hover backgrounds use the measured bar height to retain symmetric insets when content grows. Club uses Lucide’s shield in both navigation and club headers.

## Intent and implementation status

This is a native-first, presentation-only layer. The app composes its public components; it does not use raw HTML, React Native views/controls, style objects, utility classes, color values, or third-party visual components directly. The single showcase is directly accessible at `/design-system`, without a product navigation link.

The system implements type, layout, surfaces, buttons, badges, avatars, icons, fields, switches, segmented controls, selects, comboboxes, menus, date and time pickers, progress, rolling numbers, rows, dialogs, themes, reduced motion, and a responsive shell. Recurrence editors, attachments, nested menus, multi-selects, sheets, virtualized lists, tables and charts remain future additions.

The design references are [Recess Component APIs](https://app.notion.com/p/rec-team/Recess-Component-APIs-3c1f117be00481c3a622c6390fafdf04), Emil Kowalski’s [design-engineering skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) and [Expo animation skill](https://github.com/emilkowalski/skills/blob/main/skills/animate-expo/SKILL.md), and Vercel’s installed React best-practices guidance. Recess supplies the vocabulary and ownership pattern; its organizational migration instructions do not apply to this new app.

## Color and typography

| Brand token | Value | Use |
| --- | --- | --- |
| Moss | `#021E00` | Small club badge, light theme |
| Pine | `#033300` | Small club badge, dark theme |
| Accent | `#0D4FF7` | Primary buttons and focus family |
| Black | `#000000` | Primary light-theme text |
| White | `#FFFFFF` | Primary light surface |

Edwin’s palette revision supersedes the broader colors in the original brand image. Canvas, surfaces, secondary text, borders, selection, switches and progress are neutral. Primary text is black in light mode and white in dark mode; secondary text uses accessible gray. Forest, spring and beluga are removed from the brand palette. Moss/pine are reserved for small club accents. Accent identifies primary actions and appears once in the Colors section. Warning, danger and success use separate semantic colors.

Components consume `background.primary/secondary/selected/tertiary/hover/pressed/contrast`, `text.primary/secondary/contrast`, and `accent.background/hover/pressed/foreground`. Contrast backgrounds pair with contrast text; accent buttons retain white foregrounds in both themes. Themes also own border, focus, switch and status pairings. Primary buttons use the accent palette. Secondary buttons have a neutral fill with a stronger neutral hover; ghost buttons start transparent with secondary text and gain a subtle neutral fill on hover. Disabled buttons use neutral colors; loading buttons retain their base colors. Pressed colors are explicit rather than created by reducing opacity.

The Colors showcase groups compact scales under Background, Text, Brand, Accent, Success, Warning and Danger. Accent and status scales use `subtle`, `muted`, `border`, `solid` and `text` steps, defined separately for light and dark themes in `color-scales.ts`. Theme status pairings reference these scales directly. Background and Text show their semantic roles; Brand retains the exact Moss/Pine anchors. Rows scroll horizontally on narrow screens.

Status pairs are `success`, `warning`, and `danger`, with pale backgrounds/dark text in light mode and deep backgrounds/light text in dark mode. Product props use `kind="success"` or semantic text tones; raw colors stay inside the system. Validation uses danger text plus a concise error label. Event filters and contextual tabs use segmented controls with a neutral selected surface. Navigation uses the `selection` button treatment. Automated contrast checks cover every button state, status pairs, scale text on subtle/muted fills, ordinary text, selected surfaces, contrast text and switch thumbs.

| Variant | Typeface and weight | Size / line height |
| --- | --- | --- |
| h1 | Inter Semibold 600 | 32 / 38 |
| h2 | Inter Semibold 600 | 28 / 34 |
| h3 | Inter Semibold 600 | 22 / 28 |
| h4 | Inter Semibold 600 | 18 / 24 |
| body | Inter Regular 400 | 16 / 24 |
| small | Inter Regular 400 | 14 / 20 |
| label | Inter Medium 500 | 14 / 20 |
| field | Inter Regular 400 | 13 / 18 |
| caption | Inter Regular 400 | 12 / 18 |
| overline | Inter Semibold 600 | 11 / 16 |
| number | Inter Medium 500, tabular digits | 32 / 40 |

Only four heading sizes and one heading weight. Only three Inter weights. Native text scales with accessibility settings. Rolling digits scale their measured cell dimensions with the system font scale rather than clipping the default-size type. No fake bold or new local font-size variants.

Inter is the sole typeface. The heading token maps directly to Inter Semibold; Regular, Medium and Semibold are bundled locally through `src/design-system/fonts.ts`. The showcase displays typography samples without a font-status label.

## Foundation tokens

Single source of truth: `src/design-system/tokens.ts`. Native adapters consume the values directly; the showcase reads those same values. Generate web CSS variables from that source if a separate web adapter is later introduced, rather than maintaining a second manual token list.

| Family | Tokens |
| --- | --- |
| Space | none 0, half 2, xxs 4, xs 8, sm 12, md 16, lg 24, xl 32, xxl 48, xxxl 64 |
| Radius | none 0, xs 4, sm 6, md 8, lg 12, xl 16, xxl 24, xxxl 32, round 9999 |
| Elevation | none, raised, floating, overlay; token owns native elevation and box-shadow |
| Opacity | backdrop 0.1; applied to the contrast-colored scrim, never the panel |
| Layers | base 0, raised 1, selected 2; sticky 10, popover 20, backdrop 30, modal 40, toast 50, tooltip 60 |
| Duration | instant 0ms, fast 120ms, standard 200ms, toggle 220ms, slow 280ms |
| Easing | strong ease-out, movement ease-in-out, native-sheet curve; no ease-in option |
| Controls | One shared density: 36px desktop height; 12px horizontal and 8px vertical padding; 13px text / 18px line height; 8px icon gap; 16px icons and button spinner |
| Geometry | native/touch controls 44, segment inset 2 within the shared outer height, switch track 32×18 and thumb 14 within a 44 target, other icons 20, calendar days 36/44, avatar 36, content max 1080, reading max 720, wide layout breakpoint 900 |

The numerical radius scale is verified against [Linear’s public website stylesheet](https://static.linear.app/web/_next/static/css/index.DF8NERDv.css), read September 7, 2026. Its public styles also use 4/8/12/16/24/32 spacing frequently, but do not expose one canonical app spacing scale. These are public website references, not a claim to have extracted the authenticated app’s tokens. Edwin’s screenshot guides the restrained composition. Controls use 6px corners, panels 8px, dialogs 12px; large-radius tokens are available but unused by ordinary cards. Surface padding is 12/16/24 for compact/standard/spacious. Page sections use 24px gaps. Semantic `corners` roles are control/item 6px, panel 8px, overlay 12px and pill for circular/capsule controls. Floating menus share a themed material shadow; dialogs add a broad shadow and a subtle edge glow in dark mode.

0/1 values used for layout ratios are structural, not new spacing tokens. Dynamic values such as a progress fraction are derived data geometry, not caller styling. Native modals use the platform presentation stack; numerical z-index alone cannot put a normal view above a native modal. Portals and stacking rules belong inside this system.

## Public API contract

| Component | Main supported props | Owns |
| --- | --- | --- |
| Text | `variant`, `tone`, `align`, children | Font family, type scale, color, heading accessibility role |
| Stack / Row / Grid | Token `gap`, Stack token `padding`, alignment/justification, responsive grid behavior | Layout and external spacing |
| Surface | `variant`, `density`, optional token `padding`, `elevation`, children | Solid background, border, radius, internal padding, shadow |
| EventActions | `status`, `attendanceCount`, `onAttendance` | Single row with Status first and a labeled attendance count second; the status field shrinks on narrow screens |
| Button | `label`, `onPress`, `prefix`, `variant`, `isDisabled`, `isLoading`, `isSelected`, optional `staffRole`, `testID` | Target size, loading guard, focus/hover/press, accessible label/state; role label belongs inside the same hit target |
| Badge | `label`, semantic `kind`, optional `compact` | Paired foreground/background; passive and never an action |
| Icon / Avatar | Curated `name`/tone, or identity `name` | Consistent icon source/size; deterministic avatar colors from semantic muted/text pairs |
| IconButton | Accessible `label`, curated `icon`, `onPress`, `isDisabled` | Shared ghost-button hover/focus/press behavior; square target and required accessible name |
| ContentRow | `title`, `description`, `identity`, explicit `control` slot | Repeated row anatomy; never creates nested click targets |
| Field | `label`, `value`, `onValueChange`, `placeholder`, `hint`, `error`, `isDisabled`, `multiline` | Persistent label, typography, validation/focus appearance and accessible hint |
| Toggle | `label`, `description`, `value`, `onValueChange`, `isDisabled` | Shared compact track/thumb, checked/disabled semantics, visible focus, 44px target; native Pressable and semantic web button adapters |
| SegmentedControl | `label`, typed `value`, typed options with optional `isDisabled`, `onValueChange`, labels/icons `variant` | One measured sliding background; horizontal overflow; radio semantics, keyboard focus and disabled states |
| ThemeToggle | Light/dark `value`, `onValueChange` | Sun/moon radio options in a compact pill; accessible labels and shared segmented-control behavior |
| Select / Combobox | `label`, optional typed `value`, typed `options`, `onValueChange`, `placeholder`, `isDisabled` | Controlled single selection, optional icons, disabled choices; combobox adds filtering, clearing and empty results |
| ActionMenu | `label`, typed `groups`, `isDisabled`; actions carry stable `id`, `label`, optional icon/danger tone, `isDisabled`, `onSelect` | Group labels, separators, disabled/destructive styling, action selection and dismissal |
| DatePicker | `label`, optional `value`, `onValueChange`, inclusive `min`/`max`, `isDisabled` | Calendar selection, direct date entry, shortcuts, clearing, bounds and focus |
| TimeSelector | `label`, optional `value`, `onValueChange`, `isDisabled` | Manual time entry, quarter-hour suggestions on web, native time selection, clearing and validation |
| Progress | `label`, `value`, `max` | Clamping, semantics, paired track/fill, animated fill changes and reduced motion |
| ProfileSwitcher | `label`, selected `value`, typed profile `options`, `onValueChange` | Avatar/name choices, selected/focus/press states, wrapping layout and accessible names; switching itself never navigates |
| RollingNumber | Nonnegative integer `value`, spoken `label` | Digit motion, tabular alignment, accessible value, reduced motion |
| Dialog | `isOpen`, `onOpenChange`, `title`, optional `staffRole` and `footer`, children | Platform modal, dismissible contrast scrim at 15%, solid panel and themed shadow/glow, top-right X, bottom-right actions, Android Back/Escape handling |
| PageLayout | Title/subtitle, navigation data, accessory, children | Safe areas, scrolling, max width, fixed navigation and page gutters |

Page titles and subtitles are optional. The showcase omits both, uses a clean neutral background, and displays only section labels, components and short sample values. Technical guidance stays in this document. The validation sample has independent editable state; its `Required` message clears for nonblank input. Primary, Secondary and Ghost examples open a short dialog.

The theme control takes visual direction from [Geist’s Theme Switcher](https://vercel.com/geist/theme-switcher), implemented with the existing native primitives and Lucide icons. This app offers Light and Dark only, with Light as the initial preview theme. The page palette changes immediately; switch color transitions reset on a theme change to avoid briefly mixing light and dark colors.

Dialogs render their translucent backdrop as a separate pressable layer so outside clicks/taps close them. The bounded panel is a sibling above the backdrop: interaction inside it cannot bubble into the dismiss action. Long content scrolls inside the panel. The X and Done actions both call the controlled close callback. Titles wrap beside the close button. Icons use the existing Lucide React Native package with direct imports. [Base UI’s dialog examples](https://base-ui.com/react/components/dialog#outside-scroll-dialog) define inline SVGs rather than selecting an icon dependency; [Lucide supports React Native](https://lucide.dev/guide/react-native) and remains the app’s shared icon source.

Buttons, segmented groups, fields, dropdowns and date/time triggers share one `control` token family: 36px desktop outer height, 8px top/bottom and 12px left/right padding, and 13px text with an 18px line height. Button text uses the same size and line height as fields. The segment track's 2px inset is subtracted from each option's vertical padding and height, keeping the complete group aligned with other controls. Small icons and button spinners both draw at 16px. Spinners occupy a fixed text-height slot: web/Android use an explicit size, and iOS scales its native small indicator. Reduced motion pauses the spinner without hiding it. Compound-input action targets extend into the padding so visible edge icons retain the same inset. Multiline fields and wrapped text may grow.

Native controls use 44px targets. Web controls use one shared pointer media query for touch sizing; a narrow laptop panel remains 36px. The web sizing hook supplies the desktop height during static rendering, matching popup CSS, so buttons do not initially render at the native minimum while dropdowns render at the desktop minimum. The former separate button/field density tokens and viewport-width sizing branch are removed.

The `danger` button variant uses `dangerAction.background/hover/pressed/foreground`, with white text on accessible red in both themes. Status badges continue to use the softer danger scale. Disabled danger buttons use the same neutral treatment as other disabled buttons. The showcase danger action only opens a sample dialog.

Avatars choose a stable color family from the normalized name; muted backgrounds pair with the same scale’s text color in both themes.

Select, Combobox and ActionMenu expose one semantic API across platforms. Their web adapters use [Base UI Select](https://base-ui.com/react/components/select), [Combobox](https://base-ui.com/react/components/combobox), and [Menu](https://base-ui.com/react/components/menu) for keyboard navigation, focus, typeahead/filtering, positioning and dismissal. Styling stays in the design system: shared 36px triggers, 32px menu rows, 12px popup corners, 4px popup padding, neutral hover and a subtle floating shadow. Touch rows are 44px. Popups enter/exit over 120ms and honor reduced motion. Search ignores case, surrounding whitespace and accents. Product values use `undefined`; adapters translate Base UI’s `null` contract internally.

Web dialogs provide a local popup portal container so dropdowns remain within the dialog focus boundary and above its content. Escape closes an open dropdown first; the key release is withheld from React Native Web’s outer-dialog listener. Native adapters use the existing modal with 44px choice/action rows and a search field for comboboxes. Base UI and DOM styling remain in web files. The Dropdowns examples update local selections and show which menu action was chosen; they do not mutate club data. The dialog example also contains an Audience select for layering review.

DatePicker uses [React DayPicker](https://daypicker.dev/guides/input-fields) within a Base UI Popover on web. The compact calendar includes month navigation, keyboard day navigation, a distinct today marker, selected/disabled days, Today/Tomorrow shortcuts, and Clear. Direct entry accepts `YYYY-MM-DD`, `today`, or `tomorrow`; Enter applies. Invalid or out-of-range input stays editable with an error. Outside press and Escape dismiss without applying typed drafts. Calendar navigation is instant; popup motion follows the shared reduced-motion setting.

TimeSelector uses [Base UI Autocomplete](https://base-ui.com/react/components/autocomplete). Suggestions cover 24 hours at 15-minute intervals, but manual entry accepts any minute, including `6:07 PM` and `18:07`. Enter or blur commits valid text; Escape restores the saved value; invalid text does not change it. The current suggestion has a checkmark. Both controls support clearing and disabled state.

Native adapters use Expo-compatible [system date/time pickers](https://docs.expo.dev/versions/latest/sdk/date-time-picker/): Android's calendar/clock dialogs and iOS's inline calendar/time wheel in an Apply/Cancel dialog. Cancel and outside dismissal preserve the saved value. Date values and limits are local calendar strings (`YYYY-MM-DD`); time values are local clock strings (`HH:mm`), and empty values are `undefined`. These components do not convert to UTC or resolve event time zones/DST. That belongs in the event scheduling model. The native dependency requires a rebuilt development client; platform exports are not native compilation tests.

Use `variant` for treatment, `kind` for meaning, `density` for designed-component padding, and token `gap`/`padding` only for layout primitives. Parents own external spacing. The initial button prefix is a curated noninteractive icon; expand to a discriminated affix type only when avatar/count/text suffixes are actually needed. No arbitrary React-node icon overrides.

Controlled inputs use `value` and `onValueChange`. Controlled overlays use `isOpen` and `onOpenChange`. The new system consistently uses `isDisabled`/`isLoading`; the reference document contains both native-name and prefixed-state recommendations, so one local convention is chosen explicitly.

No public `style`, `className`, slot-class, raw color, margin, or arbitrary numeric dimension props. No temporary “unsafe” escape hatch in the new app. If a layout cannot be expressed, add the smallest reusable semantic variant inside the system, then show it in the showcase.

## Motion decisions

Use motion to explain changed state, not to delay navigation. Frequent peer navigation is instant. Button movement is a near-imperceptible 120ms scale to 0.97 on pointer press. Digit changes use a 200ms strong ease-out transform; React does not update once per animation frame. Mounted numbers start at their actual value. Reduced motion suppresses movement, including when the preference changes while the app is open.

Switch thumbs travel 14px in 220ms with the control easing curve. Track, border and thumb colors transition together over the same duration. Reduced motion makes them immediate. Switches are controlled and never update their own stored value. The web adapter uses an HTML button with `role="switch"`, explicit Tab stops, checked state and Space/Enter shortcut metadata. A 2px focus ring surrounds the actual target during keyboard use; pointer interaction clears it. Space/Enter activation stays with the browser primitive to avoid duplicate toggles. Disabled switches leave the Tab order. Native adapters are explicitly accessible and focusable when enabled, with checked/disabled state. Product code uses only `Toggle`. The showcase includes on/off and disabled on/off examples.

Segmented controls use 2px track padding and the shared 12px horizontal label inset. The selection is flat, without a border or shadow. Hover sits on the base layer, selection on the raised layer, and transparent option controls/labels above both. One shared selection background moves and resizes over 220ms. Selection and content update immediately. The indicator starts at the measured selected option without an entrance animation; subsequent layout changes update its bounds. Long groups scroll horizontally. Web options use grouped native radio inputs for Tab, arrow-key and Space behavior, plus Enter activation. Labels remain available to assistive technology in the icon variant. Reduced motion makes the indicator move immediately.

Progress fills transition between widths over 280ms with the control easing, including mid-animation reversals. Initial render shows the actual value. Reduced motion applies fill changes immediately. The showcase’s Add/Remove controls update both the counter and capacity bar.

Native stack transitions/sheets should own hierarchical navigation as those flows are built. Use the platform modal primitive for the initial dialog. Use a maintained sheet/gesture primitive for interactive dismissal; do not rebuild a gesture engine. Haptics are a later native integration: at most one per meaningful user action, always paired with visible feedback.

Review on a release build: rapidly reverse the counter while it is moving; cross 9/10 and 99/100; press/release/cancel; toggle reduced motion; change font scale; exercise Android Back and iOS modal focus. Code/bundle checks cannot certify feel, focus restoration, or frame performance.

## Enforcement and quality gates

`bun run check:design` parses product TypeScript/JSX and fails on native/visual-library imports, internal design-system imports, raw HTML tags, raw style props, JSX spreads that could forward styles, and imperative `createElement` composition. TypeScript constrains token and variant values. Biome owns formatting/import cleanup. The design-system folder is the deliberate implementation boundary, not an exemption for product components hidden there.

This is an architectural guard against ordinary regressions, not a security sandbox against malicious source code. Review new visual dependencies and any change to the guard. The public index is an intentional package boundary; library internals remain private even though Vercel’s general guidance favors direct imports elsewhere.

Each new component joins the same showcase with default, focus, pressed/selected, disabled, loading, error, empty and long-content states as applicable. Evaluate light/dark, reduced motion, narrow phone/tablet/laptop, 200% text, keyboard and screen readers. Do not call the system visually approved until that pass has happened.

## Next component families, when needed

1. Event editor: form field grouping, recurrence summary/editor, time-zone validation and confirmation dialog.
2. Attendance: virtualized selectable rows, searchable picker, filters, batch-action bar, late-reason sheet and undo feedback.
3. Inbox: message list/composer, attachment picker, unread marker, announcement editor, acknowledgement row, accessible menu.
4. Coaching: formation/group board, move/swap sheet, private/published audience control, timeline, goal status and rubric controls.
5. Reporting: data table and chart adapter with accessible textual equivalent, protocol-aware fitness chart and export controls.

Use platform primitives first, maintained native headless libraries for difficult interaction behavior, and Base UI behind web-only adapters where appropriate. Keep caller APIs stable while platform internals differ.

## App patterns

[Linear’s UI refresh](https://linear.app/changelog/2026-03-12-ui-refresh) informs the dimmer navigation, consistent alignment and clearer view controls; this is not a copy of private app tokens. Semantic background tokens define opaque app surfaces. `materials.ts` defines floating navigation tint, edge highlights, blur, saturation and shared overlay shadows for both themes. Popups and dialogs stay opaque.

`ChoiceOption.tone` accepts success, danger or warning. Select derives its trigger tint from the selected option and applies the same semantic scale to menu choices. RSVP uses success for Going, danger for Not going and warning for Not responded/Waitlisted. Locked registration is neutral and disabled. Labels remain visible so color is supplementary.

Contextual staff actions use `Button.staffRole` with a compact label inside the button. `StaffSection` identifies a whole staff-only collection in its header; staff dialogs place the label beside the title. Standalone role badges between unrelated toolbar actions are not used.

`PersonPicker` uses a Base UI radio menu on web and a vertical profile list in the native dialog, grouping the signed-in person and children. Its optional account action names the signed-in account and opens Account settings. With one profile it becomes an Account menu and omits profile-switching choices. `EventCard` separates an explicit details target from a compact action footer; callers supply content and actions without styling. `GlassIconButton` owns its circular hit area, hover, pressed and focus states. `NavigationFrame` reuses `SegmentIndicator`, keeping hover underneath the moving selection. Selecting a tab updates its indicator before routing work, yielding one paint before the route transition. Queued navigation is cancelled on replacement, route changes or unmount. Reduced motion navigates immediately. The indicator memoizes unchanged geometry so page-data updates do not restart its 220ms movement.

The showcase includes family and single-profile account menus, event cards, solid panels, floating navigation and a semantic status selector. The web preview has been visually checked in light and dark themes, including keyboard status selection. Native touch and glass performance still need device review.
