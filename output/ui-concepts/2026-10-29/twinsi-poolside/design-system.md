# Crocs / Poolside

Proposed design system and concept direction, inspired by [Gabriel Valdivia’s Twinsi case study](https://www.gabrielvaldivia.com/work/twinsi). This is an original adaptation for the Calgary Crocs app, not a reproduction of Twinsi or a claim about its exact fonts, colors, or implementation. No application code is changed.

## Style summary

Bright, characterful fitness utility. Immersive, softly lit 3D scenes provide warmth; crisp white utility screens keep the product fast to read. Athletic condensed headings, neutral body type, black line icons, fine gray outlines, and generously rounded controls make the system feel sporty without becoming a game. A small amount of brand-blue-to-sky-blue progress color adds energy to an otherwise restrained palette.

The defining contrast is **expressive content, quiet interface**. Unlike the Orb exploration, this direction uses white as the default canvas and avoids heavy black framing, large filled cards, and orange on every action.

## What carries over—and what does not

Carry over the cinematic scene-to-white transition, friendly dimensional art, condensed typographic hierarchy, subtle outlines, simple pills, and high-impact progress visualization. Use a small Crocs mascot as a decorative club identity cue, not a conversational feature.

Do not import the reference product’s AI companion, health score, unlockables, energy currency, wardrobe, competitive leaderboards, or full-screen social feed. Crocs remains a club coordination app: attendance, practices, teams, messages, feedback, and swim tests. Personal feedback is never converted into a public achievement automatically.

## Foundations

### Proposed color tokens

| Token | Value | Role |
| --- | --- | --- |
| canvas | #FFFFFF | Main background and cards |
| surface-subtle | #F5F5F3 | Quiet grouping and received messages |
| surface-selected | #E8E8E5 | Selected pill/tab |
| ink | #141414 | Text, active navigation, primary buttons |
| ink-muted | #6B6B6B | Dates, supporting labels |
| border | #E5E5E3 | Decorative separators and card edges |
| border-control | #858580 | Interactive outlines requiring visible contrast |
| progress-start | #0D4FF7 | Existing shared brand accent; gradient start |
| progress-middle | #2789FA | Proposed blue transition stop |
| progress-end | #63C9F5 | Proposed sky-blue gradient end |
| positive | #168454 | Attending and improved results |
| negative | #BA3E48 | Not attending and worsened results |
| positive-surface | #E8F4ED | Selected Yes background |
| negative-surface | #FAECEE | Selected No background |

Brand blue #0D4FF7 comes from packages/design-system/src/tokens.ts. Other values are proposed Crocs tokens, not sampled Twinsi specifications. Gradients are decorative/progress fills, not small text backgrounds. Pair status color with text and an icon. Do not tint an entire event card based on one household member’s RSVP.

### Typography

Proposed pairing: **Roboto Condensed** for headings and large results; **Inter** for body and controls. Confirm font assets and supported weights before implementation. Keep typography behind shared design-system primitives.

| Role | Size / line height | Weight |
| --- | --- | --- |
| Page title | 30 / 36 | Bold condensed |
| Section heading | 18 / 24 | Bold condensed; short uppercase labels only |
| Card title | 20 / 26 | Bold condensed |
| Main result | 30 / 34 | Bold condensed, tabular figures |
| Body and controls | 16 / 22 | Regular / medium |
| Supporting text | 14 / 20 | Regular |

Avoid condensed paragraphs, long all-caps labels, tiny gray text, or another headline repeating the modal title. Use the event name as the details link, with a chevron and an accessible label.

### Geometry and layout

- Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Phone page gutters: 20; card padding: 16; section gaps: 24–32.
- Card radius: 24; inset/thumbnail radius: 12–16; controls: full pill.
- Touch targets: at least 44 × 44, including icon actions.
- Default surfaces use outlines, not visible drop shadows. Reserve soft shadows for floating controls, sheets, and menus.
- Data screens do not need a card around every item. Group related rows into one surface with subtle separators.
- On desktop, keep reading widths bounded and use a two-column layout where useful. Do not stretch phone rows across the entire viewport.
- Respect device safe areas, font scaling, and narrow widths. Labels wrap; trailing values stay aligned; no fixed-height message bubbles.

## Component contracts

### Navigation

Keep existing destinations: Home, Schedule, Messages, Account, Club. Use outlined inactive icons and a filled/strong black active icon with its label. The bottom bar is a floating translucent white glass dock: subtle backdrop blur, a fine luminous edge, and restrained shadow. Use approximately 60–75% white as a starting treatment, validating contrast against real scrolled content. Inset the dock from the sides, respect the device safe area, and reserve its height in scroll content so actions are never obscured. Use a sufficiently opaque white fallback where blur/transparency is unavailable or reduced transparency is requested. Account has peer tabs: Membership, Progress, Feedback, Attendance. Horizontal tabs may scroll on narrow screens; never shrink labels into illegibility.

### Home and coach workspace

Default Home prioritizes Shoutouts, Feedback, then Upcoming schedule. Use a compact header; remove the large mascot hero so these sections are accessible immediately. Shoutouts are explicitly public-to-club praise; Feedback contains only the selected player’s authorized private feedback. Each section has View all across from its heading, a concise preview, and an honest empty state. The shared event card still powers Upcoming schedule.

Authorized coaches get a For you / Coaching subtab within Home. This is a workspace preference, not a permission or identity switch. Remember their last choice; members without coaching access see the normal Home without an unnecessary switch. Do not add a sixth primary navigation destination. Club retains the complete operational tool directory and a discoverable Coaching dashboard link to the same workspace.

Coach dashboard order: next assigned practice with readiness for Plan and Teams; Needs attention with scoped goal requests and the coach’s own unfinished feedback; relevant players; shortcuts to Player reviews, Fitness tests, and Coaching hours. Drill into existing event/member tools rather than copying their editors. Only show tasks/counts that the current account is authorized to inspect. Do not expose other coaches’ private drafts or private player notes through dashboard previews. Do not invent due dates, readiness, attendance counts, or task counts when source data is absent. Sample mock counts are fictional.

### Buttons and menus

Primary: black pill, white label. Secondary: outlined white pill, dark label. Tertiary: text/icon with a full touch target. Each section puts its action opposite its heading where space permits; wrapping is intentional on small screens. Destructive actions belong in permission-gated menus, not prominent default CTA slots.

Provide hover, pressed, focus-visible, disabled, and pending states. Pending keeps the original width and blocks duplicate requests. Permission/visibility selection belongs at the left of a form footer; Save stays right. Never rely on the visual menu alone to enforce permissions.

### Shared event card

One shared component for Home and Schedule. Header: compact date block, linked event name with chevron, prominent time, subdued venue. Content: household RSVP rows. Footer: grouped, right-aligned neutral Attendance / Plan / Teams buttons opening lightweight previews. The event name opens the full details page; omit More details.

The same information order applies to every screen. Home can show a smaller preview variant, but must not introduce a separate RSVP implementation. Show preview availability honestly: an unpublished lineup must say so, with no draft data exposed.

### RSVP row

Name left, Yes/No controls right. Selected Yes: positive-tinted surface, green text/check, selected state. Selected No: negative-tinted surface, red text/check, selected state. Unselected choices remain neutral. A missing response looks different from either selection. Announce selected state accessibly; show errors near the affected row and preserve the previous response on failure.

### Goal

One current-goal surface: title and Edit, goal text, check-in fraction, progress bar, Reflections and Check in. Use Set goal when empty. Keep approval/publishing workflow separate from the user-facing goal wording. Progress fraction and bar must agree. The gradient is not a general decoration or a fake health metric.

### Fitness test row

Two-line layout: test name and personal best on the left; latest value and change on the right. Improvement uses green; regression uses red. The arrow describes the numeric change, not whether it is good: a faster swim uses a green down arrow, more pool lengths uses a green up arrow. No repeated Latest label or better/worse prose. Accessibility text supplies meaning, e.g. “3 seconds faster than your previous result.” Neutral/no comparison states use a dash or no change; do not invent an improvement. Pass/fail results show a status, not a meaningless numeric delta.

### Feedback

Dedicated Account/member Feedback tab, not a modal hiding three unrelated workflows. Separate sections: Your reflections, From your coaches, Video review. Reflect applies to the current player’s own session reflection. Add feedback appears only within the coach section for authorized users and identifies the target player. When a coach is viewing their own account, separate self-reflection from coach feedback; do not present both as an ambiguous Add dropdown.

Coach feedback composition can offer Rating and Note as explicit formats after choosing the player and practice. An optional numeric rating plus written feedback can share one submission flow, preserving existing data semantics. Existing coach-only versus player/guardian visibility must remain explicit and enforced. Notes have no public likes by default.

### Messages

Organize the inbox into Channels, Direct messages, and Groups sections beneath search and a simple All/Unread filter. Channels contain club/program/event rooms; DMs and private groups remain distinct conversation types. Do not duplicate conversations into multiple sections or resurrect the retired automatic Staff room. Empty sections can collapse away; a search result can retain its section label for context. Support sensible row limits with View all per section for large clubs, without mounting unbounded message histories.

Compact conversation rows use small avatars, clear preview text, time, and unread counts. Conversation bubbles wrap naturally and reserve room for reactions below. On touch, long press opens message actions; on desktop, hover/focus can reveal a spaced action group. Do not leave an ellipsis or reaction button overlapping the message text. Preserve an accessible non-gesture route to actions. Conversation hides global navigation to give the composer room.

### Scenes and illustration

The initial exploration included a softly sunlit pool scene and small friendly green crocodile. The revised Home removes that large hero in favor of content-first sections. Keep dimensional illustration optional in small editorial thumbnails, onboarding, or empty states, never as a requirement above useful content. No full-screen runtime shader, forced character customization, or dubious sports-equipment anatomy. Use static responsive assets and stable reserved layouts. The mascot never conveys essential information alone.

## Motion and performance

Implement using existing shared motion tokens only. Page/tab fades use the project’s slow duration (300ms) and out easing; avoid adding page travel or spring bounce. Respect reduced motion. Keep lightweight placeholders and deferred images from flashing or shifting the layout. Scenes are static by default. Mount only necessary previews and do not preload whole app screens for decorative effects.

## Accessibility, security, and states

- Validate final foreground/background pairs to WCAG AA; subtle decorative borders are not sufficient focus or interactive boundaries.
- Focus rings, icon labels, selected state, and dynamic announcements must work without color.
- Every list has loading, empty, error, and populated states; do not promote a missing-data state into invented content.
- Keep permission checks in backend queries and mutations, not just hidden UI. Guest, guardian, coach, and administrator data scopes are unchanged.
- Protect unpublished lineups, private notes, child records, video visibility, and household contact details.
- Verify 320–430px widths, large text, long names, long messages, and the keyboard/composer safe area before shipping.

## Deliverables

- 01-system-blue.png: current visual foundations and component specimen; replaces the orange/pink exploration.
- 02-home-schedule.png: illustrated Home and utility-first Schedule.
- 03-messages-conversation.png: inbox and conversation.
- 04-progress-feedback-blue.png: current Progress and dedicated Feedback, using the club blue gradient.
- 05-home-schedule-glass.png: current Home order (Shoutouts, Feedback, Upcoming schedule) and glass navigation; supersedes 02-home-schedule.png.
- 06-messages-coaching.png: current sectioned Messages and Home → Coaching dashboard; supersedes the earlier flat inbox.
- tokens.json: proposed machine-readable design tokens.
- prompts.json: exact built-in image-generation prompt set.
- revision-prompts.json: exact blue, Home/glass, and Messages/Coaching revision prompts.

Generated mocks illustrate art direction rather than pixel-perfect implementation or production authorization. This written system is the source of truth if a generated image adds an inconsistent detail. Known raster-mock limitations: the superseded Schedule date strip duplicates Wednesday/Thursday 29; the current version removes that strip. Character portraits are illustrative rather than a consistent identity set; some body text is more condensed than the proposed Inter specification. The newer Home and Coaching boards establish the glass-navigation treatment for all primary screens; earlier boards have the superseded opaque footer. These are not implementation requirements.
