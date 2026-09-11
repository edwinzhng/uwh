import type { ReactElement } from "react";
import { PoolLocation } from "./pool-location";

type PracticeScheduleProps = { location: string; address: string };
const regularTimes = [
	{ day: "Sunday*", times: ["9–10:30 am", "or 7–8:30 pm"] },
	{ day: "Monday**", times: ["8:30–10 pm"] },
	{ day: "Thursday", times: ["8–9:30 pm"] },
	{ day: "Friday", cadence: "Every other week", times: ["8:30–9:30 pm"] },
];
const schedules = [
	{
		name: "Youth",
		season: "September–June",
		times: regularTimes,
		notes: [
			"Youth practices focus on building swimming ability, athleticism, and skills like puck control, positioning, and communication in a fun, supportive environment. Players regularly scrimmage against other youth, applying what they’ve learned in game situations while building confidence and teamwork.",
			"Thursdays are faster paced and geared towards advanced players.",
		],
	},
	{
		name: "Adults",
		season: "September–June",
		times: regularTimes,
		notes: [
			"Members can attend any practice they choose and attendance is not mandatory, with the exception of Mondays, which are reserved for committed players. Competition teams may have specific attendance requirements that will be communicated accordingly.",
		],
	},
];
export const PracticeSchedule = ({
	location,
	address,
}: PracticeScheduleProps): ReactElement => (
	<div className="practice-background">
		<section
			id="schedule"
			className="practice-section wrap"
			aria-labelledby="practice-heading"
		>
			<h2 id="practice-heading">Practice schedule</h2>
			<div className="practice-grid regular-season-grid">
				{schedules.map((schedule) => (
					<article className="practice-card" key={schedule.name}>
						<header>
							<h3>{schedule.name}</h3>
							<p className="practice-season">{schedule.season}</p>
						</header>
						<dl className="practice-times">
							{schedule.times.map((slot) => (
								<div key={slot.day}>
									<dt>
										{slot.day}
										{"cadence" in slot ? (
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
						<p className="practice-note">
							* Sunday times vary with pool events.
						</p>
						<p className="practice-note">
							** Mondays are for committed players.
						</p>
						<PoolLocation
							name={location}
							address={address}
							href="https://www.google.com/maps/search/?api=1&query=MNP+Community+%26+Sport+Centre+2225+Macleod+Trail+SE+Calgary"
						/>
						{schedule.notes.length > 0 && (
							<details className="practice-notes">
								<summary>About {schedule.name.toLowerCase()} practices</summary>
								{schedule.notes.map((note) => (
									<p key={note}>{note}</p>
								))}
							</details>
						)}
					</article>
				))}
			</div>
			<section className="summer-schedule" aria-labelledby="summer-heading">
				<header>
					<h3 id="summer-heading">Summer practices</h3>
					<p>July–August</p>
				</header>
				<div className="summer-sessions">
					<article className="practice-card">
						<h4>Tuesday</h4>
						<p className="summer-time">7:30–9 pm</p>
						<PoolLocation
							name="Millican-Ogden Outdoor Pool"
							address="2094 69 Avenue SE, Calgary"
							href="https://www.google.com/maps/search/?api=1&query=Millican+Ogden+Outdoor+Pool+2094+69+Avenue+SE+Calgary"
						/>
					</article>
					<article className="practice-card">
						<h4>Thursday</h4>
						<p className="summer-time">7:30–9 pm</p>
						<PoolLocation
							name={location}
							address={address}
							href="https://www.google.com/maps/search/?api=1&query=MNP+Community+%26+Sport+Centre+2225+Macleod+Trail+SE+Calgary"
						/>
					</article>
				</div>
			</section>
		</section>
	</div>
);
