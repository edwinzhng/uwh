import type { ReactElement } from "react";
import { Footer } from "../../components/footer";
import { getContent } from "../../lib/store";
export const dynamic = "force-dynamic";
const Coaches = async (): Promise<ReactElement> => {
	const c = await getContent();
	return (
		<>
			<main className="page wrap">
				<p className="eyebrow">The people behind the practice</p>
				<h1>Our coaches.</h1>
				{c.coaches.length ? (
					<div className="coach-grid">
						{c.coaches.map((p) => (
							<article className="coach" key={p.name}>
								<h2>{p.name}</h2>
								<p className="eyebrow">{p.role}</p>
								<p>{p.bio}</p>
							</article>
						))}
					</div>
				) : (
					<p className="empty">
						Coach profiles are being updated.{" "}
						<a
							href={`mailto:${c.email}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							Contact the club
						</a>
					</p>
				)}
			</main>
			<Footer />
		</>
	);
};
export default Coaches;
