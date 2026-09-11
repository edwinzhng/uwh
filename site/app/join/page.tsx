import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Footer } from "../../components/footer";
import { InterestForm } from "../../components/interest-form";

export const metadata: Metadata = { title: "Join" };
const Join = (): ReactElement => (
	<>
		<main className="page wrap join-grid">
			<div>
				<p className="eyebrow">See you underwater</p>
				<h1>
					Come give it
					<br />a try.
				</h1>
				<p className="lede">
					Tell us a little about yourself. We’ll help you find a session and get
					started.
				</p>
				<p className="lede">
					Already playing? Choose season registration and we’ll help with the
					next steps.
				</p>
			</div>
			<InterestForm />
		</main>
		<Footer />
	</>
);
export default Join;
