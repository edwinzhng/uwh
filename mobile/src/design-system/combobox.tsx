import type { ReactElement } from "react";
import { NativePicker } from "./native-picker";
import type { PickerProps } from "./picker-props";

export const Combobox = <T extends string>(
	props: PickerProps<T>,
): ReactElement => <NativePicker {...props} searchable />;
