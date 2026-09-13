import type { ReactElement } from "react";
import {
	Background,
	Disclosure,
	Grid,
	Heading,
	LocationLink,
	ScheduleCard,
	Section,
	SectionHeading,
	Text,
} from "../design-system";

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
	<Background variant="practice">
		<Section id="schedule" variant="practice" labelledBy="practice-heading">
			<Heading id="practice-heading">Practice schedule</Heading>
			<Grid variant="practice">
				{schedules.map((schedule) => (
					<ScheduleCard
						key={schedule.name}
						title={schedule.name}
						season={schedule.season}
						slots={schedule.times}
						notes={[
							"* Sunday times vary with pool events.",
							"** Mondays are for committed players.",
						]}
					>
						<LocationLink name={location} address={address} />
						<Disclosure
							label={`About ${schedule.name.toLowerCase()} practices`}
						>
							{schedule.notes.map((note) => (
								<Text key={note}>{note}</Text>
							))}
						</Disclosure>
					</ScheduleCard>
				))}
			</Grid>
			<Section variant="summer" labelledBy="summer-heading">
				<SectionHeading
					id="summer-heading"
					title="Summer practices"
					subtitle="July–August"
				/>
				<Grid variant="summer">
					<ScheduleCard title="Tuesday">
						<Text variant="time">7:30–9 pm</Text>
						<LocationLink
							name="Millican-Ogden Outdoor Pool"
							address="2094 69 Avenue SE, Calgary"
						/>
					</ScheduleCard>
					<ScheduleCard title="Thursday">
						<Text variant="time">7:30–9 pm</Text>
						<LocationLink name={location} address={address} />
					</ScheduleCard>
				</Grid>
			</Section>
		</Section>
	</Background>
);
