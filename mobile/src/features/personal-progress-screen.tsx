import { type ReactElement, useState } from "react";
import { useActivePerson } from "../demo/app-state";
import { TabContent, Tabs } from "../design-system";
import { ClubShell } from "./club-shell";
import { MemberAttendance } from "./member-attendance";
import { MemberProgress } from "./member-progress";

export const PersonalProgressScreen = (): ReactElement => {
	const person = useActivePerson();
	const [tab, setTab] = useState("progress");
	return (
		<ClubShell
			title="Progress & feedback"
			subtitle={person.name}
			tabs={
				<Tabs
					page
					label="Personal records"
					hideLabel
					value={tab}
					onValueChange={setTab}
					options={[
						{ value: "progress", label: "Progress" },
						{ value: "attendance", label: "Attendance" },
					]}
				/>
			}
		>
			<TabContent value={tab}>
				{tab === "attendance" ? (
					<MemberAttendance key={person.id} member={person} />
				) : (
					<MemberProgress member={person} />
				)}
			</TabContent>
		</ClubShell>
	);
};
