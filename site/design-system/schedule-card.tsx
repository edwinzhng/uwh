import type { ReactElement, ReactNode } from "react";
export const ScheduleCard = ({
	title,
	season,
	slots,
	notes,
	children,
}: {
	title: string;
	season?: string;
	slots?: { day: string; cadence?: string; times: string[] }[];
	notes?: string[];
	children: ReactNode;
}): ReactElement => (
	<article className="practice-card">
		<header>
			<h3>{title}</h3>
			{season ? <p className="practice-season">{season}</p> : undefined}
		</header>
		{slots ? (
			<dl className="practice-times">
				{slots.map((slot) => (
					<div key={slot.day}>
						<dt>
							{slot.day}
							{slot.cadence ? (
								<small className="practice-cadence">{slot.cadence}</small>
							) : undefined}
						</dt>
						<dd>
							{slot.times.map((time) => (
								<span key={time}>{time}</span>
							))}
						</dd>
					</div>
				))}
			</dl>
		) : undefined}
		{notes?.map((note) => (
			<p key={note} className="practice-note">
				{note}
			</p>
		))}
		{children}
	</article>
);
export const SectionHeading = ({
	title,
	subtitle,
	id,
}: {
	title: string;
	subtitle: string;
	id: string;
}): ReactElement => (
	<header>
		<h3 id={id}>{title}</h3>
		<p>{subtitle}</p>
	</header>
);
