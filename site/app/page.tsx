import type { ReactElement } from "react";
import { ClubVideo } from "../components/club-video";
import { Footer } from "../components/footer";
import { Hero } from "../components/hero";
import { JoinButton } from "../components/join-button";
import { Policies } from "../components/policies";
import { PracticeSchedule } from "../components/practice-schedule";
import {
	Background,
	Container,
	Heading,
	Main,
	Section,
	Stack,
	Strong,
	Text,
} from "../design-system";
import { clubPolicies } from "../lib/policies";
import { getContent } from "../lib/store";
export const revalidate = 300;
const Home = async (): Promise<ReactElement> => {
	const content = await getContent();
	return (
		<>
			<Main>
				<Hero headline={content.headline} intro={content.intro} />
				<Section id="about" variant="overview">
					<Heading level={2}>Underwater hockey</Heading>
					<Text>
						A low-contact, co-ed sport played six-a-side on the bottom of a
						swimming pool. Players use snorkeling gear and short sticks to move
						a weighted puck, all while holding their breath.
					</Text>
				</Section>
				<Container>
					<ClubVideo />
				</Container>
				<Background variant="joining">
					<Section>
						<Heading level={2}>Joining the club</Heading>
						<Stack>
							<Text>
								New players are always welcome! The{" "}
								<Strong>first two weeks are free</Strong>, and our annual club
								membership costs $200/year. The club will provide trial starter
								equipment including mask, snorkel, water polo caps, fins,
								sticks, glove, and mouthguard.
							</Text>
							<Text>
								Our players span a wide variety of skill levels, ranging from
								absolute beginners to players who've competed at multiple world
								championships. Club members regularly compete at major
								tournaments across Canada and internationally.
							</Text>
							<JoinButton>Join today</JoinButton>
						</Stack>
					</Section>
				</Background>
				<PracticeSchedule
					location={content.location}
					address={content.address}
				/>
				<Policies
					documents={[
						...clubPolicies,
						...content.documents.filter(
							(document) =>
								!clubPolicies.some((policy) => policy.url === document.url),
						),
					]}
					email={content.email}
				/>
			</Main>
			<Footer />
		</>
	);
};
export default Home;
