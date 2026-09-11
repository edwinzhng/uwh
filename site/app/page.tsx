import type { ReactElement } from "react";
import { ClubVideo } from "../components/club-video";
import { Footer } from "../components/footer";
import { Hero } from "../components/hero";
import { JoinButton } from "../components/join-button";
import { Policies } from "../components/policies";
import { PracticeSchedule } from "../components/practice-schedule";
import { clubPolicies } from "../lib/policies";
import { getContent } from "../lib/store";
export const dynamic = "force-dynamic";
const Home = async (): Promise<ReactElement> => {
	const content = await getContent();
	return (
		<>
			<main>
				<Hero headline={content.headline} intro={content.intro} />
				<section id="about" className="club-section club-overview wrap">
					<h2>Underwater hockey</h2>
					<p>
						A low-contact, co-ed sport played six-a-side on the bottom of a
						swimming pool. Players use snorkeling gear and short sticks to move
						a weighted puck—
						<span className="overview-accent">all on a single breath.</span>
					</p>
				</section>
				<div className="wrap">
					<ClubVideo />
				</div>
				<div className="joining-background">
					<section className="club-section wrap">
						<h2>Joining the club</h2>
						<div>
							<p>
								New players are always welcome! The{" "}
								<strong>first two weeks are free</strong>, and our annual club
								membership costs $200/year. The club will provide trial starter
								equipment including mask, snorkel, water polo caps, fins,
								sticks, glove, and mouthguard.
							</p>
							<p>
								Our players span a wide variety of skill levels, ranging from
								absolute beginners to players who've competed at multiple world
								championships. Club members regularly compete at major
								tournaments across Canada and internationally.
							</p>
							<JoinButton className="button button-green">
								Join today
							</JoinButton>
						</div>
					</section>
				</div>
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
			</main>
			<Footer />
		</>
	);
};
export default Home;
