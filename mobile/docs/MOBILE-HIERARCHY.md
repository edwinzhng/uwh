# Mobile hierarchy

Implemented first-pass structure, September 7, 2026. See [implementation status](IMPLEMENTATION.md) for working features and remaining scope.

Four stable tabs: **Schedule / Messages / Members / Club**. Everyone starts on Schedule. Permissions add contextual tools; users do not need to switch into a separate role mode.

The simplified pass adds Upcoming / Calendar / Past directly on Schedule, with signup/cancel beside each session. Calendar days show event markers and reveal that day’s sessions underneath. An Attendance shortcut opens the roster directly; Here, Late and No-show each take one tap, and tapping the selected status clears it. Personal profiles open on Progress. Registration, Payments and Equipment are direct Club links.

```text
APP
├─ Schedule
│  └─ Event
│     ├─ Overview          Details, own/child response, shared teams
│     ├─ People            Responses; staff attendance and lateness
│     └─ Coaching          Assigned coaches: plan, teams, feedback
├─ Messages
│  ├─ Chats               Program channels and direct conversations
│  └─ Notices             Announcements and acknowledgement
├─ Members
│  └─ Member
│     ├─ Profile
│     ├─ Progress          Self, linked guardians, assigned coaches
│     └─ Admin             Administrators
└─ Club
   ├─ My membership       Self or selected child
   ├─ Resources
   └─ Administration      Administrators
      ├─ Registration
      ├─ Payments
      ├─ Equipment
      ├─ Programs
      └─ Settings         Trackers, requests, account access
```

## Account and personal context

The account owns permissions and sends messages. A person is the self/child whose response, progress or membership is currently visible. Program selection is an independent content filter.

```text
┌────────────────────────────────────────┐
│ (☰) Crocs           [Me ▾]   (bell) (⚙)│
│                                        │
│ Schedule                      [+ Event]│
│                                        │
│ [Upcoming | Past]       All programs ▾ │
│                                        │
│ Thu, Sep 10                            │
│ ┌────────────────────────────────────┐ │
│ │ Thursday training                > │ │
│ │ 7:45–9:00 PM · MNP Centre          │ │
│ │ Club · 13 going          [Going ▾] │ │
│ └────────────────────────────────────┘ │
│                                        │
│  ╭──────────────────────────────────╮  │
│  │ Schedule  Messages  Members  Club│  │
│  ╰──────────────────────────────────╯  │
└────────────────────────────────────────┘
```

`+ Event` appears only for admins, with a compact Admin label inside the button. The bottom navigation floats on subtle translucent glass. The top-left profile menu includes Account settings. Content panels, menus and dialogs use solid neutral surfaces; primary actions use accent blue. RSVP uses green for Going, red for Not going and amber for Not responded/Waitlisted.

```text
┌────────────────────────────────────────┐
│ Managing                           [×] │
│                                        │
│ [Me ✓]       [Sam]        [Mila]        │
└────────────────────────────────────────┘
```

Switching preserves the page and program filters. It updates personal controls in place. An explicit roster profile remains that member’s profile; a personal shortcut follows Me/Sam/Mila. Pending writes keep their captured person ID. DMs retain their participants and sender, regardless of the selected child.

## Contextual coaching

```text
┌────────────────────────────────────────┐
│ ← Schedule                             │
│ Thursday training                      │
│ Thu, Sep 10 · 7:45–9:00 PM              │
│                                        │
│ Overview   People   [Coaching]         │
│                                        │
│ Session plan                    [Edit] │
│ Transitions and defensive shape        │
│                                        │
│ Teams                       [Generate] │
│ Black · 7              White · 6        │
│ Alex                   Sam             │
│ ...                    ...             │
│ Draft                        [Publish] │
│                                        │
│ Player feedback                      > │
└────────────────────────────────────────┘
```

People holds observed attendance controls. Coaching is limited to assigned programs. Admin status alone does not grant this tab. Attendance changes mark a generated lineup for review before publication. Player feedback is written against a named member and is explicitly private, draft or published.

## Member and club operations

```text
┌────────────────────────────────────────┐
│ ← Members                              │
│ Sam Rivera                             │
│ Youth · Club                           │
│                                        │
│ Profile   [Progress]   Admin           │
│                                        │
│ Current goal                 [Change] │
│ Scan before receiving                  │
│ [━━━━━━━━━━━━────────]  4 of 6         │
│                                        │
│ Feedback                    [+ Feedback]│
│ Shared · Sep 7                         │
│ Your first touch is calmer…            │
│                                        │
│ Attendance                             │
│ 8 attended · 1 late                    │
└────────────────────────────────────────┘
```

The sketch shows maximum authorized tools. Players and linked guardians see published feedback and attendance. Coaches see coaching tools. Only administrators see Admin, which holds registration, balances, equipment and custom trackers.

Club combines personal membership with an Administration entry for authorized accounts. This lets someone pay attention to their own child and run club operations without changing modes. The hamburger provides Administration and Account shortcuts; the four bottom tabs stay stable.

The larger product specification adds public calendars, notification history, attachments, assessment modules, configurable coaching settings, multiple seasons and richer member lifecycle workflows. These are not implied by the first-pass screens.
