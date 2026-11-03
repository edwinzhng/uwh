export type Persona = "Player" | "Player with family" | "Coach" | "Admin";
export type Screen = { label: string; route: string; action?: string };
export type Flow = { text: string; screens: string[] };
export type Feature = {
	name: string;
	personas: { name: Persona; flows: Flow[] }[];
};
const screen = (
	label: string,
	route: string,
	account = "taylor",
	action?: string,
): Screen => ({
	label,
	route: `${route}${route.includes("?") ? "&" : "?"}reviewAccount=${account}`,
	action,
});
export const screens: Record<string, Screen> = {
	home: screen("Home", "/"),
	club: screen("Club", "/club"),
	programs: screen("Programs", "/programs"),
	signin: screen("Sign in", "/review-auth"),
	signup: screen("Create account", "/review-auth?mode=signUp"),
	reset: screen("Reset password", "/review-auth?mode=reset"),
	family: screen(
		"Linked profiles",
		"/account-settings?section=household",
		"jamie",
	),
	child: screen("Child profile", "/account?reviewPerson=sam", "jamie"),
	profile: screen("My profile", "/account"),
	edit: screen("Edit profile", "/account", "taylor", "Edit info"),
	schedule: screen("Schedule", "/schedule"),
	session: screen("Session", "/session?event=club-thu"),
	familySession: screen(
		"Child’s session",
		"/session?event=club-thu&reviewPerson=sam",
		"jamie",
	),
	calendar: screen("Calendar export", "/schedule", "taylor", "Add to calendar"),
	coachSession: screen(
		"Coaching workspace",
		"/session?event=club-thu&tab=coaching",
		"casey",
	),
	attendance: screen(
		"Session attendance",
		"/session?event=club-thu&tab=people",
		"casey",
	),
	history: screen("My attendance", "/account?tab=attendance"),
	childHistory: screen(
		"Child’s attendance",
		"/account?tab=attendance&reviewPerson=sam",
		"jamie",
	),
	lineup: screen(
		"Lineup editor",
		"/session?event=club-thu&tab=coaching",
		"casey",
		"Open lineup",
	),
	feedback: screen("My feedback", "/account?tab=feedback"),
	familyFeedback: screen(
		"Child’s feedback",
		"/account?tab=feedback&reviewPerson=sam",
		"jamie",
	),
	coachFeedback: screen(
		"Player feedback",
		"/member?id=sam&tab=feedback",
		"casey",
	),
	reflection: screen(
		"Session reflection",
		"/account?tab=goals&event=club-thu&reviewFlow=session-self-rating",
	),
	rating: screen(
		"Coach session rating",
		"/member?id=sam&tab=feedback&event=club-thu&reviewFlow=session-coach-rating",
		"casey",
	),
	shoutouts: screen("My shoutouts", "/shoutouts"),
	childShoutouts: screen(
		"Child’s shoutouts",
		"/shoutouts?reviewPerson=sam",
		"jamie",
	),
	giveShoutout: screen(
		"Give a shoutout",
		"/shoutouts",
		"taylor",
		"Give shoutout",
	),
	announcements: screen("Announcements", "/announcements"),
	notice: screen("New announcement", "/announcements", "casey", "New"),
	goals: screen("Goals & reflections", "/account?tab=goals"),
	childGoals: screen(
		"Child’s goals & reflections",
		"/account?tab=goals&reviewPerson=sam",
		"jamie",
	),
	coachGoals: screen(
		"Player goals & reflections",
		"/member?id=sam&tab=goals",
		"casey",
	),
	development: screen("Player reviews", "/development", "casey"),
	coachSettings: screen(
		"Private coaching details",
		"/member?id=sam&tab=coach",
		"casey",
	),
	fitness: screen("My fitness tests", "/fitness"),
	childFitness: screen("Child’s fitness tests", "/fitness?person=sam", "jamie"),
	tests: screen("Fitness tests", "/fitness", "casey"),
	test: screen("Test sessions", "/fitness?test=swim", "casey"),
	results: screen("Log results", "/fitness?test=swim&session=swim-2", "casey"),
	trends: screen(
		"Fitness progress",
		"/fitness?test=swim&view=progress&players=sam,mila",
		"casey",
	),
	chats: screen("Chats", "/messages"),
	chat: screen("Conversation", "/conversation?id=club"),
	chatTools: screen(
		"Attachment and poll options",
		"/conversation?id=club",
		"taylor",
		"Message options",
	),
	resources: screen("Files", "/resources"),
	video: screen(
		"Video and discussion",
		"/resources?id=demo-uploaded-video",
		"jamie",
	),
	resourceEdit: screen("Add file", "/resources", "casey", "New"),
	members: screen("Members", "/members"),
	member: screen("Member profile", "/member?id=sam"),
	preferences: screen("Preferences", "/account-settings"),
	notifications: screen(
		"Notification settings",
		"/account-settings?reviewFlow=notification-settings",
	),
	membership: screen("My season record", "/account?tab=membership"),
	childMembership: screen(
		"Child’s season record",
		"/account?tab=membership&reviewPerson=sam",
		"jamie",
	),
	registration: screen("Registration checklist", "/registration", "morgan"),
	payments: screen("Payments checklist", "/payments", "morgan"),
	adminRecord: screen(
		"Member season record",
		"/member?id=sam&tab=admin",
		"morgan",
	),
	terms: screen("Club terms", "/terms"),
	equipment: screen("Equipment", "/equipment", "morgan"),
	hours: screen("Coaching hours", "/coaching-hours?tab=hours", "casey"),
};
const flow = (text: string, ...screens: string[]): Flow => ({ text, screens });
const persona = (
	name: Persona,
	...flows: Flow[]
): Feature["personas"][number] => ({ name, flows });
export const features: Feature[] = [
	{
		name: "Feedback",
		personas: [
			persona(
				"Player",
				flow(
					"Home → Feedback → Read published coach feedback",
					"home",
					"feedback",
				),
				flow(
					"Account → Feedback → My reflections → Reflect → Choose practice → Rate 1–10 + note → Save",
					"feedback",
					"reflection",
				),
				flow(
					"Feedback → Coach rating → Report feedback → Give reason → Submit privately to admins",
					"feedback",
				),
			),
			persona(
				"Player with family",
				flow(
					"Account → Choose linked child → Feedback → Read published feedback",
					"child",
					"familyFeedback",
				),
				flow(
					"Child’s feedback → Report feedback → Give reason → Submit",
					"familyFeedback",
				),
				flow(
					"Switch to your own profile → My reflections → Reflect → Save your own rating",
					"family",
					"reflection",
				),
			),
			persona(
				"Coach",
				flow(
					"Club → Members → Player → Feedback → Add rating → Choose practice → Rating + notes → Save",
					"members",
					"coachFeedback",
					"rating",
				),
				flow(
					"Player → Feedback → Coach notes → Add note → Save draft / Keep private / Publish to player + family",
					"coachFeedback",
				),
				flow(
					"Session → Coaching → Player feedback → Select player → Draft → Publish",
					"coachSession",
					"coachFeedback",
				),
			),
		],
	},
	{
		name: "Shoutouts",
		personas: [
			persona(
				"Player",
				flow(
					"Home → Shoutouts → Give shoutout → Choose teammate + recognition → Optional practice + note → Send",
					"home",
					"shoutouts",
					"giveShoutout",
				),
				flow(
					"Home → Shoutouts → Read recognition received; sender stays anonymous",
					"home",
					"shoutouts",
				),
			),
			persona(
				"Player with family",
				flow(
					"Account → Choose linked child → Shoutouts → Read child’s recognition (recipient + linked household only)",
					"child",
					"childShoutouts",
				),
				flow(
					"Give shoutout → Choose recipient + recognition → Send as your signed-in account",
					"giveShoutout",
				),
			),
			persona(
				"Coach",
				flow(
					"Session → Shoutouts → Give shoutout → Choose teammate + recognition → Send anonymously",
					"coachSession",
					"giveShoutout",
				),
			),
		],
	},
	{
		name: "Events & RSVP",
		personas: [
			persona(
				"Player",
				flow(
					"Schedule → Upcoming / Past / Calendar → Session → Read date, venue, signup window + details",
					"schedule",
					"session",
				),
				flow(
					"Session → Register / Update response → Confirm → See saved response",
					"session",
				),
				flow(
					"Combined practice → Training / Hockey → Respond separately for each part",
					"session",
				),
				flow(
					"Session → Check in → Energy + private note → Save for assigned coaches",
					"session",
				),
				flow(
					"Schedule → Add to calendar → Subscribe / Download event calendar",
					"schedule",
					"calendar",
				),
			),
			persona(
				"Player with family",
				flow(
					"Home → Household session → Choose each eligible person → Save each person’s response",
					"home",
					"familySession",
				),
				flow(
					"Account → Switch linked child → Same session → Check child eligibility → Register / Update response",
					"family",
					"familySession",
				),
				flow(
					"Schedule → Add to calendar → Choose permitted household calendar → Subscribe / Download",
					"calendar",
				),
			),
			persona(
				"Coach",
				flow(
					"Schedule → Assigned session → Review roster + responses → Open assigned coaching tools",
					"schedule",
					"coachSession",
				),
				flow(
					"Session → Review private player check-ins → Prepare coaching",
					"coachSession",
				),
			),
		],
	},
	{
		name: "Programs",
		personas: [
			persona(
				"Player",
				flow(
					"Club → Programs → Browse active / Archived programs → Read standing schedule + status",
					"club",
					"programs",
				),
			),
			persona(
				"Player with family",
				flow(
					"Club → Programs → Read program schedules → Schedule → Respond separately for eligible household members",
					"programs",
					"familySession",
				),
			),
			persona(
				"Coach",
				flow(
					"Club → Programs → Review program schedule + roster summary → Coaching → Review assignments",
					"programs",
					"hours",
				),
			),
		],
	},
	{
		name: "Attendance",
		personas: [
			persona(
				"Player",
				flow(
					"Account → Attendance → Choose season → Review participation + lateness",
					"history",
				),
			),
			persona(
				"Player with family",
				flow(
					"Account → Choose linked child → Attendance → Choose season → Review child’s history",
					"child",
					"childHistory",
				),
			),
			persona(
				"Coach",
				flow(
					"Session → People → Mark present / late / absent → Add permitted late details → Save / Correct",
					"attendance",
				),
				flow(
					"Club → Attendance → Filter assigned scope → Review totals + denominators",
					"club",
				),
			),
		],
	},
	{
		name: "Session plans & teams",
		personas: [
			persona(
				"Player",
				flow(
					"Schedule → Session → Read published session plan + goals → Open published lineup",
					"schedule",
					"session",
				),
			),
			persona(
				"Player with family",
				flow(
					"Choose linked child → Session → Read published plan → Find child’s published team + position",
					"familySession",
				),
			),
			persona(
				"Coach",
				flow(
					"Session → Coaching → Edit plan + goals / game focus → Save draft → Publish shared plan (staff notes stay private)",
					"coachSession",
				),
				flow(
					"Session → Coaching → Teams → Generate → Open lineup → Move / Swap / Assign referee → Save draft → Publish",
					"coachSession",
					"lineup",
				),
				flow(
					"Open lineup → Make changes → Undo / Restore draft → Save → Publish revision",
					"lineup",
				),
			),
		],
	},
	{
		name: "Announcements",
		personas: [
			persona(
				"Player",
				flow(
					"Home announcement / Club → Announcements → Read → Dismiss banner if desired; no acknowledgement task",
					"home",
					"announcements",
				),
			),
			persona(
				"Player with family",
				flow(
					"Home / Club → Announcements → Read notices permitted to account + household",
					"announcements",
				),
			),
			persona(
				"Coach",
				flow(
					"Club → Announcements → New → Body + assigned audience + expiry → Publish",
					"announcements",
					"notice",
				),
				flow(
					"Announcements → Own permitted notice → Edit / End → Save",
					"announcements",
				),
			),
		],
	},
	{
		name: "Fitness tests",
		personas: [
			persona(
				"Player",
				flow(
					"Home / Club → Fitness tests → Choose season → Test → Read latest result, personal best + history",
					"home",
					"fitness",
				),
			),
			persona(
				"Player with family",
				flow(
					"Choose linked child → Fitness tests → Choose season → Test → Read child’s results",
					"child",
					"childFitness",
				),
			),
			persona(
				"Coach",
				flow(
					"Club → Fitness tests → New test → Protocol + units + scoring direction → Save",
					"tests",
				),
				flow(
					"Fitness tests → Test → New session → Date → Save",
					"tests",
					"test",
				),
				flow(
					"Test → Session → Log player results + notes → Save → Correct result if needed",
					"test",
					"results",
				),
				flow(
					"Fitness tests → Progress / Overview → Select players + compatible protocol → Compare dated results",
					"tests",
					"trends",
				),
			),
		],
	},
	{
		name: "Goals & player development",
		personas: [
			persona(
				"Player",
				flow(
					"Account → Goals & reflections → Set / Edit goal → Category + focus + remarks → Save / Propose change",
					"goals",
				),
				flow(
					"Goals & reflections → Check in → Self-rating + dated reflection → Save",
					"goals",
				),
			),
			persona(
				"Player with family",
				flow(
					"Choose linked child → Goals & reflections → Read goal / Add permitted reflection with its actual author",
					"child",
					"childGoals",
				),
			),
			persona(
				"Coach",
				flow(
					"Members → Player → Goals & reflections → Create / Review proposed goal → Save decision",
					"members",
					"coachGoals",
				),
				flow(
					"Club → Player reviews → Player → Submit private coaching scores → Complete review round → Finalize balancing rating",
					"development",
				),
				flow(
					"Member → Coach → Positions + age group + private coaching details → Save",
					"coachSettings",
				),
			),
		],
	},
	{
		name: "Chats & polls",
		personas: [
			persona(
				"Player",
				flow(
					"Chats → All / DMs / Groups / Channels → Conversation → Read + send message",
					"chats",
					"chat",
				),
				flow(
					"Chats → New message → Choose person / People + group name → Start conversation",
					"chats",
				),
				flow(
					"Conversation → Plus options → Photos / Files / Polls → Attach / Configure → Send",
					"chat",
					"chatTools",
				),
				flow(
					"Message → Reply / React / Edit own / Delete own → Confirm action",
					"chat",
				),
				flow(
					"Conversation → Pinned messages / Polls → Open → Read / Vote / Change vote before closing",
					"chat",
				),
				flow("Message / Conversation → Report / Block → Confirm", "chat"),
			),
			persona(
				"Player with family",
				flow(
					"Chats → Permitted program / Event channel → Read + send as signed-in guardian account (profile switching does not impersonate child)",
					"chats",
					"chat",
				),
			),
			persona(
				"Coach",
				flow(
					"Chats → Assigned program / Event / Staff room → Coordinate session",
					"chats",
					"chat",
				),
				flow(
					"Conversation → Create poll → Options + deadline → Send → Review results / Close",
					"chat",
					"chatTools",
				),
				flow(
					"Message actions → Pin important message → View pins / Unpin",
					"chat",
				),
			),
		],
	},
	{
		name: "Files & video",
		personas: [
			persona(
				"Player",
				flow(
					"Club → Files → Search / Documents / Videos → Open permitted resource → Read / Download / Watch",
					"club",
					"resources",
					"video",
				),
				flow(
					"Video → Discussion → Add comment / Reply within permitted audience",
					"video",
				),
			),
			persona(
				"Player with family",
				flow(
					"Club → Files → Open document / Clip permitted through child’s program → Read / Watch",
					"resources",
					"video",
				),
				flow(
					"Choose child → Feedback → Assigned videos → Open clip + discussion",
					"familyFeedback",
					"video",
				),
			),
			persona(
				"Coach",
				flow(
					"Files → New → Title + Type + Description → Upload / Supported embed → Permissions → Save",
					"resources",
					"resourceEdit",
				),
				flow("Video → Edit → Title / Description / Media → Save", "video"),
				flow(
					"Resource → Edit → Update / Archive within assigned scope → Save",
					"resources",
				),
			),
		],
	},
	{
		name: "Profiles & household",
		personas: [
			persona(
				"Player",
				flow(
					"Account menu → View profile → Edit info → Name + cap number + contact details → Save",
					"profile",
					"edit",
				),
				flow("Edit info → Choose photo → Crop → Save", "edit"),
				flow(
					"Club → Members → Search → Member profile → Message / Permitted profile actions",
					"club",
					"members",
					"member",
				),
			),
			persona(
				"Player with family",
				flow(
					"Account menu → Choose self / Linked child → Profile context updates → Continue current flow",
					"family",
					"child",
				),
				flow(
					"Account settings → Linked profiles → Add profile → Enter dependent details → Save",
					"family",
				),
				flow(
					"Account settings → Linked profiles → Invitation → Review → Accept / Decline verified link",
					"family",
				),
				flow(
					"Linked profiles → Choose default / Unlink dependent → Confirm",
					"family",
				),
				flow(
					"Choose linked child → View profile → Edit info / Photo → Save child’s profile",
					"child",
				),
			),
			persona(
				"Coach",
				flow(
					"Club → Members → Search assigned roster → Player → Open permitted coaching tools",
					"members",
					"coachSettings",
				),
			),
		],
	},
	{
		name: "Notifications & preferences",
		personas: [
			persona(
				"Player",
				flow(
					"Notification bell → All / Unread → Item → Open linked event, message or feedback → Read state updates",
					"home",
				),
				flow(
					"Account menu → Settings → Notifications → Choose topics + delivery → Enable supported device notifications",
					"preferences",
					"notifications",
				),
				flow(
					"Settings → Preferences → Appearance / Motion / Haptics → Change preference",
					"preferences",
				),
			),
			persona(
				"Player with family",
				flow(
					"Notification bell → Child-related item → Open permitted record with correct household context",
					"home",
					"familyFeedback",
				),
				flow(
					"Account settings → Notifications → Set account delivery preferences for permitted household activity",
					"notifications",
				),
			),
			persona(
				"Coach",
				flow(
					"Notification bell → Coaching / Session activity → Open assigned record → Complete coaching action",
					"home",
					"coachSession",
				),
			),
		],
	},
	{
		name: "Registration, payment & waiver",
		personas: [
			persona(
				"Player",
				flow(
					"Account → Membership → Season → Check registration: Missing / Awaiting review / Approved + CUGA membership",
					"membership",
				),
				flow(
					"Membership → Payments → Read dues, paid amount, outstanding balance → History (payments recorded manually; no checkout)",
					"membership",
				),
				flow(
					"Sign in → Required club terms → Read published version → Explicitly accept → Continue (separate from a signed waiver)",
					"signin",
					"terms",
				),
				flow(
					"Waiver checklist → Electronic waiver signing has no implemented flow; confirm the club’s external process",
				),
			),
			persona(
				"Player with family",
				flow(
					"Choose each linked child → Membership → Season → Check registration + balance for each person separately",
					"child",
					"childMembership",
				),
				flow(
					"Club terms → Signed-in account accepts current terms; child waiver / guardian signing is not an implemented flow",
					"terms",
				),
			),
			persona(
				"Admin",
				flow(
					"☐ Registration: Club → Registration → Season → Member → Set Missing / Awaiting review / Approved + CUGA membership",
					"registration",
					"adminRecord",
				),
				flow(
					"☐ Payment: Club → Payments → Member → Set dues / Record payment / Refund → Save → Check remaining balance + history",
					"payments",
					"adminRecord",
				),
				flow(
					"☐ Waiver: Check external waiver status; no dedicated signed-waiver screen or electronic signature flow exists",
				),
			),
		],
	},
	{
		name: "Equipment",
		personas: [
			persona(
				"Player",
				flow(
					"Equipment management is admin-only → Ask staff to issue / Return equipment",
				),
			),
			persona(
				"Player with family",
				flow(
					"Equipment management is admin-only → Ask staff to manage household loans",
				),
			),
			persona(
				"Admin",
				flow(
					"Club → Equipment → Items → Issue loan to member / Guest → Record return → Review Returns",
					"equipment",
				),
			),
		],
	},
	{
		name: "Coaching hours",
		personas: [
			persona(
				"Coach",
				flow("Club → Hours → Program coaches → Edit program defaults", "hours"),
				flow(
					"Club → Hours → Select coach → Total hours + Practices coached",
					"hours",
				),
			),
		],
	},
	{
		name: "Sign in & account",
		personas: [
			persona(
				"Player",
				flow(
					"Open app → Sign in → Verify account as required → Join / Accept invitation → Club access",
					"signin",
					"home",
				),
				flow(
					"Sign in → Create account → Enter details → Verify email → Join club",
					"signin",
					"signup",
				),
				flow(
					"Sign in → Forgot password → Request code → Verify → New password → Sign in",
					"signin",
					"reset",
				),
				flow(
					"Account settings → Account & security → Sign out other devices → Confirm (live account only)",
				),
				flow("Account menu → Sign out → Sign-in screen", "signin"),
				flow(
					"Account settings → Account & security → Delete account → Review consequences → Confirm required steps (live account only)",
				),
			),
			persona(
				"Player with family",
				flow(
					"Sign in as guardian → Accept verified household invitation → Choose linked profile → Continue",
					"signin",
					"family",
				),
			),
			persona(
				"Coach",
				flow(
					"Sign in → Club membership + assigned coaching permissions → Assigned coaching tools",
					"signin",
					"coachSession",
				),
			),
		],
	},
];
