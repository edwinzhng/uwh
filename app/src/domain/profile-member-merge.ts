import type { MemberProfileFields } from "./member-profile";

export const mergedProfileFields = (
	source: MemberProfileFields | undefined,
	target: MemberProfileFields | undefined,
	fillEmpty: boolean,
): { fields: MemberProfileFields; filledFields: string[] } => {
	const fields: MemberProfileFields = {
		email: target?.email || (fillEmpty ? source?.email : "") || "",
		phone: target?.phone || (fillEmpty ? source?.phone : "") || "",
		capNumber: target?.capNumber ?? (fillEmpty ? source?.capNumber : undefined),
		photoId: target?.photoId ?? (fillEmpty ? source?.photoId : undefined),
	};
	return {
		fields,
		filledFields: [
			...(!target?.email && fields.email ? ["Email"] : []),
			...(!target?.phone && fields.phone ? ["Phone"] : []),
			...(target?.capNumber === undefined && fields.capNumber !== undefined
				? ["Cap number"]
				: []),
			...(!target?.photoId && fields.photoId ? ["Profile photo"] : []),
		],
	};
};
