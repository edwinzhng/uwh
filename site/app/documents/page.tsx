import type { ReactElement } from "react";
import { Footer } from "../../components/footer";
import { getContent } from "../../lib/store";
export const dynamic = "force-dynamic";
const Documents = async (): Promise<ReactElement> => {
	const c = await getContent();
	return (
		<>
			<main className="page wrap">
				<p className="eyebrow">Club information</p>
				<h1>Documents.</h1>
				{c.documents.length ? (
					c.documents.map((d) => (
						<a
							className="doc"
							href={d.url}
							key={d.url}
							target="_blank"
							rel="noreferrer"
						>
							<span>
								{d.title}
								<small>{d.category}</small>
							</span>
						</a>
					))
				) : (
					<p className="empty">
						Documents are being updated.{" "}
						<a
							href={`mailto:${c.email}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							Ask us for a copy
						</a>
					</p>
				)}
			</main>
			<Footer />
		</>
	);
};
export default Documents;
