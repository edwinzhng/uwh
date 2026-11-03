import { atom } from "jotai";
import type { NotificationPreferences } from "../domain/notification-preferences";

export const previewNotificationPreferences = atom<
	Record<string, NotificationPreferences>
>({});
