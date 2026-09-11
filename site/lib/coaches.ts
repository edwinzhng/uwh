export type CoachProfile = {
	name: string;
	role: string;
	club: string;
	playingSince: string;
	bio: string;
	image?: string;
	experience?: { role: string; details: string }[];
	source?: string;
};

export const coaches: CoachProfile[] = [
	{
		name: "Jordan Fryers",
		image: "/coaches/jordan-fryers.jpg",
		role: "Head coach",
		club: "Calgary",
		playingSince: "1997",
		bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
		experience: [
			{
				role: "Player",
				details: "2004 Canada U19 Men; 2006, 2008, 2013, 2018 Canada Elite Men",
			},
			{
				role: "Coach",
				details: "2015 Canada U23 Women (assistant); 2019 Canada U24 Men",
			},
		],
		source: "https://uwhehteam.yolasite.com/players.php",
	},
	{
		name: "Bryn Anderson",
		image: "/coaches/bryn-anderson.jpg",
		role: "Coach",
		club: "Wellington",
		playingSince: "2013",
		bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
	},
	{
		name: "Aimee Schoenberger",
		image:
			"https://canadauwhjuniorgirls.yolasite.com/resources/Aimee%20(2).JPG?timestamp=1413293985879",
		role: "Coach",
		club: "Calgary",
		playingSince: "2013",
		bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
		experience: [
			{
				role: "Player",
				details: "2017 Canada U19 Women; 2027 Canada Elite Women (upcoming)",
			},
		],
		source: "https://canadauwhjuniorgirls.yolasite.com/players.php",
	},
	{
		name: "Nathaniel Schoenberger",
		role: "Coach",
		club: "Calgary",
		playingSince: "2012",
		bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
		image:
			"https://www.sheffielduwh2019.co.uk/wp-content/uploads/2019/07/can_mu24_5.png",
		experience: [
			{
				role: "Player",
				details: "2015, 2017 Canada U19 Men; 2019 Canada U24 Men",
			},
		],
		source: "https://www.sheffielduwh2019.co.uk/player/nathaniel-schoenberger/",
	},
	{
		name: "Edwin Zhang",
		role: "Coach",
		club: "Calgary",
		playingSince: "2007",
		bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
		image: "/coaches/edwin-zhang.jpg",
		experience: [
			{
				role: "Player",
				details:
					"2015, 2017 Canada U19 Men; 2019 Canada U24 Men; 2027 Canada Elite Men (upcoming)",
			},
		],
		source: "https://www.sheffielduwh2019.co.uk/player/edwin-zhang/",
	},
];
