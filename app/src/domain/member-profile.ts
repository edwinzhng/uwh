import { canManagePerson } from "./app-rules";
import type { Account, Member } from "./app-types";

export type MemberProfileFields = {
	capNumber?: number;
	email: string;
	phone: string;
	photoId?: string;
};
export type MemberProfile = {
	personId: string;
	name: string;
	capNumber?: number;
	photoId?: string;
	contact?: { email: string; phone: string };
	revision: number;
	canEdit: boolean;
};
export type MemberProfileInput = {
	name: string;
	capNumber: string;
	email: string;
	phone: string;
	photoId?: string;
};
export type MemberProfileSave = MemberProfileInput & {
	personId: string;
	revision: number;
	expectedName: string;
	key: string;
};
export const memberProfileLimits = {
	name: 80,
	email: 254,
	phone: 32,
	photoBytes: 5 * 1024 * 1024,
	pendingPhotos: 4,
	photoLifetime: 24 * 60 * 60 * 1000,
} as const;
export const canEditMemberProfile = (
	account: Pick<Account, "personId" | "children">,
	member: Pick<Member, "id" | "archived">,
): boolean =>
	!member.archived &&
	(account.personId === member.id || account.children.includes(member.id));
export const memberProfileError = (
	input: MemberProfileInput,
): string | undefined => {
	if (!input.name.trim()) return "Add a name";
	if (input.name.trim().length > memberProfileLimits.name)
		return "Keep the name to 80 characters";
	const email = input.email.trim();
	if (
		email &&
		(email.length > memberProfileLimits.email ||
			!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
	)
		return "Enter a valid email";
	const phone = input.phone.trim();
	const digits = phone.replace(/\D/g, "");
	if (
		phone &&
		(phone.length > memberProfileLimits.phone ||
			!/^\+?[\d\s().-]+$/.test(phone) ||
			digits.length < 7 ||
			digits.length > 15)
	)
		return "Use a phone number with 7–15 digits";
	const cap = input.capNumber.trim();
	if (cap && (!/^\d{1,2}$/.test(cap) || Number(cap) < 1 || Number(cap) > 99))
		return "Choose a cap number from 1–99";
	if (input.photoId && input.photoId.length > 120)
		return "Choose a valid profile photo.";
	return undefined;
};
export const normalizeMemberProfile = (
	input: MemberProfileInput,
): MemberProfileFields & { name: string } => ({
	name: input.name.trim(),
	email: input.email.trim().toLowerCase(),
	phone: input.phone.trim(),
	capNumber: input.capNumber.trim()
		? Number(input.capNumber.trim())
		: undefined,
	photoId: input.photoId || undefined,
});
export const profileInput = (profile: MemberProfile): MemberProfileInput => ({
	name: profile.name,
	capNumber: profile.capNumber?.toString() ?? "",
	email: profile.contact?.email ?? "",
	phone: profile.contact?.phone ?? "",
	photoId: profile.photoId,
});
export const memberProfileProjection = (
	account: Account,
	member: Member,
	fields?: MemberProfileFields & { revision: number },
): MemberProfile => ({
	personId: member.id,
	name: member.name,
	capNumber: fields?.capNumber,
	photoId: fields?.photoId,
	contact: canManagePerson(account, member.id)
		? { email: fields?.email ?? "", phone: fields?.phone ?? "" }
		: undefined,
	revision: fields?.revision ?? 0,
	canEdit: canEditMemberProfile(account, member),
});
