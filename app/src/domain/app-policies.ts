export type AppPolicy = {
	slug: string;
	title: string;
	intro: string;
	sections: string[][];
};
export const appPolicies: AppPolicy[] = [
	{
		slug: "privacy",
		title: "Privacy Policy",
		intro:
			"UWH Club helps underwater hockey clubs manage activities and communicate.",
		sections: [
			[
				"Information we collect",
				"We store account details, club memberships, player and household profiles, registrations, attendance, coaching and fitness records, messages, and files you share. We also process session and device information needed for security and notifications.",
				"If you sign in with Google or Apple, we receive your provider account identifier, email address, and name when supplied. We use these to sign you in and connect your account. Google sign-in does not give us access to your Gmail or Google Calendar.",
			],
			[
				"How we use and share information",
				"We use information to operate the app, manage club access, deliver communications, and prevent abuse. Club information is shared according to membership, roles, and the feature’s audience. Reporting a message shares that message and its attachments with club moderators.",
				"Service providers process information for hosting, authentication, email, and notifications, including Convex, Resend, Expo, Apple, and Google. Information may be processed outside your country. We do not sell personal information or use it for targeted advertising.",
			],
			[
				"Permissions and children’s profiles",
				"Photos, microphone, speech recognition, and notifications require permission where applicable. Dictation may use your device platform’s speech services. Voice notes and other media you choose to send are stored as shared content.",
				"Parents and guardians may manage children’s profiles and must be authorized to provide their information.",
			],
			[
				"Retention and deletion",
				"We keep information while needed to provide the service. You can request account deletion in the app or contact us. Deletion removes account credentials and personal records; some shared content is anonymized, and historical attendance may remain. Child profiles managed by another account may also remain. Club owners may need to transfer ownership before deleting their account.",
			],
			[
				"Your choices and contact",
				"You can manage your profile, connected accounts, notification preferences, and device permissions. For access, correction, deletion, or privacy questions, email hello@calgaryuwh.com.",
				"We will update this policy when our practices change and notify you of material changes.",
			],
		],
	},
	{
		slug: "terms",
		title: "Terms of Use",
		intro: "By using UWH Club, you agree to these terms.",
		sections: [
			[
				"Your account",
				"Provide accurate information, protect your sign-in credentials, and only manage profiles you are authorized to manage. Club administrators control membership and role access.",
			],
			[
				"Respectful use",
				"Do not harass others, share unlawful or harmful content, disclose someone’s private information without permission, or attempt unauthorized access. You must have permission to upload the content you share. You retain ownership and allow us to store and display it to provide the service.",
			],
			[
				"Club activities",
				"Clubs organize their own activities and set participation requirements. Confirm important schedule and safety information with your club. Coaching and fitness information is general guidance and does not replace professional medical advice.",
			],
			[
				"Moderation and availability",
				"We may remove content or restrict access to address abuse, security issues, or violations of these terms. The app may change or be temporarily unavailable; uninterrupted service is not guaranteed.",
			],
			[
				"Leaving the service",
				"You can stop using the app or delete your account. Information is handled as described in the Privacy Policy. Changes to these terms will be communicated when material.",
				"Questions or concerns: hello@calgaryuwh.com.",
			],
		],
	},
];
