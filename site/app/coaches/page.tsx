import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { Footer } from "../../components/footer";
import { Grid, Heading, Main, ProfileCard } from "../../design-system";
import { coaches } from "../../lib/coaches";
import { coachesEnabled } from "../../lib/features";
export const metadata: Metadata = { title: "Coaches" };
const Coaches = (): ReactElement => {
	if (!coachesEnabled) notFound();
	return (
		<>
			<Main variant="coaches">
				<Heading level={1}>Coaches</Heading>
				<Grid variant="coaches">
					{coaches.map((coach) => (
						<ProfileCard
							key={coach.name}
							profile={{
								name: coach.name,
								role: coach.role === "Head coach" ? coach.role : undefined,
								bio: coach.bio,
								playingSince: coach.playingSince,
								club: coach.club,
								experience: coach.experience,
							}}
						/>
					))}
				</Grid>
			</Main>
			<Footer />
		</>
	);
};
export default Coaches;
