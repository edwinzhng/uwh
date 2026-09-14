export type FamilyProfile = {
	id: string;
	name: string;
	program: string;
	goal: {
		title: string;
		description: string;
		target: number;
		completed: number;
	};
};

export const defaultProfile: FamilyProfile = {
	id: "sam",
	name: "Sam Rivera",
	program: "Monday program",
	goal: {
		title: "Find support before the first touch.",
		description:
			"Practice scanning before receiving the puck. Reflect after each session.",
		target: 6,
		completed: 2,
	},
};

export const familyProfiles: FamilyProfile[] = [
	defaultProfile,
	{
		id: "mila",
		name: "Mila Rivera",
		program: "Monday program",
		goal: {
			title: "Make space for the next pass.",
			description:
				"Move into an open lane after passing. Notice which movement helps your teammate most.",
			target: 6,
			completed: 4,
		},
	},
];
