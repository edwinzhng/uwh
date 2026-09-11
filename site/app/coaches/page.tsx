import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Footer } from "../../components/footer";
import { coaches } from "../../lib/coaches";
export const metadata: Metadata = { title: "Coaches" };
const Coaches = (): ReactElement => (
	<>
		<main className="page wrap coaches-page">
			<h1>Coaches</h1>
			<div className="coaches-grid">
				{coaches.map((coach) => (
					<article className="coach-profile" key={coach.name}>
						<div className="coach-profile-portrait">
							<div className="coach-gradient" aria-hidden="true" />
						</div>
						<div className="coach-profile-body">
							<div className="coach-name-row">
								<h2>{coach.name}</h2>
								{coach.role === "Head coach" ? (
									<span>Head coach</span>
								) : undefined}
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
				))}
			</div>
		</main>
		<Footer />
	</>
);
export default Coaches;
