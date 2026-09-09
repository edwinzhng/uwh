import { createContext } from "react";
import type { AttendanceFlag, ReportFlag } from "../domain/attendance-report";

export const AttendanceFlagContext = createContext<
	| {
			flags: ReportFlag[];
			busy: boolean;
			set: (personId: string, kind?: AttendanceFlag) => void;
	  }
	| undefined
>(undefined);
