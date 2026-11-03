- The replacement coaching tools use the new app’s own club records. No Discord or SportEasy integration, legacy import or historical migration is included in this pass.

- Location: Club → Coach → Coaching hours; Tools: Completed-practice assignments and season totals per coach
- Location: Club → Coach → Fitness tests; Tools: Test definitions, sessions, results, bests, averages and comparisons
- Location: Club → Coach → Attendance reports; Tools: Season/month matrix, attendance percentages and player comparisons
- Location: Members → Rankings; Tools: Each coach’s own score, scoring coverage and team-balancing averages
- Location: Member → Coach; Tools: Private team rating, preferred positions and youth/adult classification
- Location: Practice → Coaching; Tools: Coach assignments, durations, session plan and teams
- Location: Practice → Attendance; Tools: Attendance correction and last-minute addition/cancellation flags

- All new queries and writes require the Coach role and are scoped to the signed-in club. Admin-only accounts cannot read private coaching records. Event creation/editing remains admin-only. Players see explicitly published lineups and feedback; private ratings, fitness results and coaching reports remain coach-only.

- Up to three official coaches can be assigned to a practice. The lineup’s top-right Coaches control edits the same assignments used by coaching hours. Durations follow the actual practice or selected practice parts; supported manual durations are 60, 90, 120, 150 and 180 minutes. Coaches can change or remove assignments. Season totals count completed, non-cancelled practices and exclude social events. Totals are shown after all bounded pages have loaded, so partial history is never presented as a complete season total.

- Tests support timed, count and pass/fail results. Coaches can rename, archive and restore test definitions. Sessions have a season, date and notes; results have optional player notes. Sessions and results can be corrected or deleted, and derived statistics update with them.

- Result entry pages contain up to 25 players; a session supports up to 500 results. Revision checks reject stale writes. Unsaved result edits block roster paging, search changes and the local back action until saved or discarded. Trends compare up to four players using the latest 100 results per player. Empty values and missing points remain gaps, and a zero count or failed test remains a real result.

- In Members → Rankings, each coach saves their own score from 0–100. Players needing scores appear first, with the current coach’s unscored players at the top; fully scored players follow. Scores can be updated, with stale-write protection per coach. The average of current coaches’ scores feeds team balancing. Imported ratings remain the initial baseline until a coach scores the player; imported values never count as attributed coach votes. Metadata edits cannot replace the scored average. Rankings, individual scores and team totals remain coach-only.

- Generation balances numbers, ratings and preferred positions. Youth can play separately or together; players can be excluded from a lineup without changing RSVP. Each team displays numbered pool positions, player avatars, a captain and its referee. Captains can be starters or substitutes and are saved, copied and published with the lineup; moving a captain to the opposing team clears that role. Separated age groups have independent captains. Team totals include substitutes and show rating coverage, with partial totals explicitly labelled. Coaches can move players between teams, change assignments, copy the lineup and publish it.

- The backend generates teams from saved private settings. Attendance or relevant settings changes mark saved plans stale and require regeneration before publication.

- Attendance percentage is present plus late divided by recorded practices. On-time percentage is present divided by attended practices. Unmarked practices do not count as no-shows; no recorded data displays an unknown percentage. Reports include completed eligible practices in the linked season and count multiple practices on one day independently.

- Last-minute addition/cancellation flags are explicit coach annotations, independent of RSVP and observed attendance. Coaches can change or clear them.

- The matrix pages players and displays eight event columns at a time in a horizontally scrollable area. Roster page size adjusts to the event count to keep backend reads bounded. Whole-season reports support up to 500 completed practices; larger seasons ask for a month. Comparisons also ask for a month when their combined record count exceeds the safe read budget.

- Run `bun run check`, then the `verify:coaching-hours`, `verify:fitness`, `verify:coaching-teams`, `verify:attendance-reports` and `verify:coaching-scale` scripts with the local backend running. `EXPO_PUBLIC_CONVEX_URL=http://127.0.0.1:3210 bun scripts/verify-player-rankings.ts` verifies scoring ownership, conflicts, captain persistence and team totals without permission changes. These use isolated fictional clubs and remove fixtures after verification.

- The scale suite covers 50 players and 520 practices, including large-season limits, monthly pagination, comparison limits and explicit season membership. Native exports verify compilation; native device interaction and store release setup remain separate work.

- Shoutouts are visible only to their recipient and linked household. Coach and administrator status does not grant read access to another player’s shoutouts. The same restriction applies to paginated feeds, profiles, session shoutouts, recognition totals and shared app data. Published is retained as the stored delivery state; it does not mean club-public. Sender identity remains anonymized in recipient payloads. Giving a shoutout is still available from the shoutouts page and practice details. Home omits empty shoutout and feedback cards, including their layout slots, for the selected household profile. Existing shoutout records already support aggregate adoption measurement without making individual content public.
