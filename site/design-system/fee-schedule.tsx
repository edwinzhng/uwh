import type { ReactElement } from "react";

type Fee = { period: string; amount: string; label?: string };

export const FeeSchedule = ({
	season,
	fees,
}: {
	season: string;
	fees: Fee[];
}): ReactElement => (
	<section className="fee-schedule" aria-label={`${season} membership fees`}>
		<header>
			<h3>Annual membership fee</h3>
			<span>{season}</span>
		</header>
		<table>
			<thead>
				<tr>
					<th scope="col">Registration time</th>
					<th scope="col">Fee</th>
				</tr>
			</thead>
			<tbody>
				{fees.map(({ period, amount, label }) => (
					<tr className="fee-schedule-row" key={period}>
						<th scope="row">
							<span className="fee-schedule-period">
								{period}
								{label && <span className="fee-schedule-label">{label}</span>}
							</span>
						</th>
						<td>{amount}</td>
					</tr>
				))}
			</tbody>
		</table>
	</section>
);
