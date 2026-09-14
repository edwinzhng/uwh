# Coaching

The replacement coaching tools use the new app’s own club records. No Discord or SportEasy integration, legacy import or historical migration is included in this pass.

## Where to find things

| Location | Tools |
| --- | --- |
| Club → Coach → Coaching hours | Completed-practice assignments and season totals per coach |
| Club → Coach → Fitness tests | Test definitions, sessions, results, bests, averages and comparisons |
| Club → Coach → Attendance reports | Season/month matrix, attendance percentages and player comparisons |
| Member → Coach | Private rating, preferred positions and youth/adult classification |
| Practice → Coaching | Coach assignments, durations, session plan and teams |
| Practice → Attendance | Attendance correction and last-minute addition/cancellation flags |

All new queries and writes require the Coach role and are scoped to the signed-in club. Admin-only accounts cannot read private coaching records. Event creation/editing remains admin-only. Players see explicitly published lineups and feedback; private ratings, fitness results and coaching reports remain coach-only.

## Hours

Each assigned coach has an independent duration. Supported durations are 60, 90, 120, 150 and 180 minutes; the initial default is 60 minutes on Friday and 90 minutes otherwise. Coaches can change or remove assignments. Season totals count completed, non-cancelled practices and exclude social events. Totals are shown after all bounded pages have loaded, so partial history is never presented as a complete season total.

## Fitness

Tests support timed, count and pass/fail results. Coaches can rename, archive and restore test definitions. Sessions have a season, date and notes; results have optional player notes. Sessions and results can be corrected or deleted, and derived statistics update with them.

Result entry pages contain up to 25 players; a session supports up to 500 results. Revision checks reject stale writes. Unsaved result edits block roster paging, search changes and the local back action until saved or discarded. Trends compare up to four players using the latest 100 results per player. Empty values and missing points remain gaps, and a zero count or failed test remains a real result.

## Teams and player settings

Coaches set private ratings from 1–100, multiple preferred positions and youth/adult classification. Generation balances numbers, ratings and positions. Youth can play separately or together; players can be excluded from a lineup without changing RSVP. Coaches can move players between teams, change assignments, copy the lineup and publish it.

The backend generates teams from saved private settings. Attendance or relevant settings changes mark saved plans stale and require regeneration before publication.

## Attendance

Attendance percentage is present plus late divided by recorded practices. On-time percentage is present divided by attended practices. Unmarked practices do not count as no-shows; no recorded data displays an unknown percentage. Reports include completed eligible practices in the linked season and count multiple practices on one day independently.

Last-minute addition/cancellation flags are explicit coach annotations, independent of RSVP and observed attendance. Coaches can change or clear them.

The matrix pages players and displays eight event columns at a time in a horizontally scrollable area. Roster page size adjusts to the event count to keep backend reads bounded. Whole-season reports support up to 500 completed practices; larger seasons ask for a month. Comparisons also ask for a month when their combined record count exceeds the safe read budget.

## Verification

Run `bun run check`, then the `verify:coaching-hours`, `verify:fitness`, `verify:coaching-teams`, `verify:attendance-reports` and `verify:coaching-scale` scripts with the local backend running. These use isolated fictional clubs and remove fixtures after verification.

The scale suite covers 50 players and 520 practices, including large-season limits, monthly pagination, comparison limits and explicit season membership. Native exports verify compilation; native device interaction and store release setup remain separate work.
