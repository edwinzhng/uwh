import type { ReactElement } from "react";

type Profile = {
	name: string;
	role?: string;
	bio: string;
	playingSince: string;
	club: string;
	experience?: { role: string; details: string }[];
};
export const ProfileCard = ({
	profile: coach,
}: {
	profile: Profile;
}): ReactElement => (
	<article className="coach-profile">
		<div className="coach-profile-portrait">
			<div className="coach-gradient" aria-hidden="true" />
		</div>
		<div className="coach-profile-body">
			<div className="coach-name-row">
				<h2>{coach.name}</h2>
				{coach.role ? <span>{coach.role}</span> : undefined}
			</div>
			<p>{coach.bio}</p>
			<dl className="coach-facts">
				<div>
					<dt>Playing since</dt>
					<dd>{coach.playingSince}</dd>
				</div>
				<div>
					<dt>Home club</dt>
					<dd>{coach.club}</dd>
				</div>
			</dl>
			{coach.experience ? (
				<div className="coach-experience">
					<span>International experience</span>
					<ul className="coach-championships">
						{coach.experience.map((entry) => (
							<li key={entry.role}>
								{entry.role}: {entry.details}
							</li>
						))}
					</ul>
				</div>
			) : undefined}
		</div>
	</article>
);
