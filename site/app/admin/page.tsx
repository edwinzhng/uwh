import { makeFunctionReference } from "convex/server";
import type { ReactElement } from "react";
import { AdminLogin } from "../../components/admin-login";
import { Editor } from "../../components/editor";
import { authorized } from "../../lib/auth";
import { backend, getContent, serverKey } from "../../lib/store";
export const dynamic = "force-dynamic";
export const metadata = {
	title: "Admin",
	robots: { index: false, follow: false },
};
type Inquiry = {
	phone?: string;
	gender?: string;
	firstSessionDate?: string;
	referral?: string;
	referralOther?: string;
	_id: string;
	name: string;
	email: string;
	interest: string;
	message: string;
	_creationTime: number;
};
const Admin = async (): Promise<ReactElement> => {
	if (!(await authorized()))
		return (
			<>
				<main className="page wrap">
					<h1>Club admin.</h1>
					<AdminLogin />
				</main>
			</>
		);
	const [content, enquiries] = await Promise.all([
		getContent(),
		backend().query(
			makeFunctionReference<"query", { key: string }, Inquiry[]>(
				"website:enquiries",
			),
			{ key: serverKey() },
		),
	]);
	return (
		<>
			<main className="page wrap">
				<h1>Website editor.</h1>
				<Editor content={content} />
				<section className="admin-section">
					<h2>Latest inquiries</h2>
					{enquiries.length ? (
						enquiries.map((e) => (
							<article className="enquiry" key={e._id}>
								<strong>{e.name}</strong> · {e.interest}
								<p>
									<a
										href={`mailto:${e.email}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										{e.email}
									</a>{" "}
									· {new Date(e._creationTime).toLocaleDateString("en-CA")}
								</p>
								<dl>
									{[
										["Phone", e.phone],
										["Gender", e.gender],
										["First session", e.firstSessionDate],
										[
											"Heard about us",
											e.referral === "Other" ? e.referralOther : e.referral,
										],
									]
										.filter(([, value]) => value)
										.map(([label, value]) => (
											<div key={label}>
												<dt>{label}</dt>
												<dd>{value}</dd>
											</div>
										))}
								</dl>
								<p>{e.message}</p>
							</article>
						))
					) : (
						<p>No inquiries yet.</p>
					)}
				</section>
			</main>
		</>
	);
};
export default Admin;
