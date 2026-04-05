function parseBooleanFlag(value?: string) {
	const normalized = value?.trim().toLowerCase();
	return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export const PRO_ENABLED = parseBooleanFlag(
	process.env.NEXT_PUBLIC_PRO_ENABLED ?? process.env.PRO_ENABLED ?? "false",
);

export const PRO_PLAN_ACTIVE = PRO_ENABLED;
export const PRO_WAITLIST_EMAIL = "owner@smartreplypro.com";
export const PRO_WAITLIST_SUBJECT = "Smart Reply Pro Pro waitlist";
export const PRO_WAITLIST_BODY = "Please notify me when Smart Reply Pro Pro is available.";

export const PRO_WAITLIST_HREF = "/pricing#pro-waitlist";

export function hasProAccess(subscriptionStatus?: string | null) {
	return String(subscriptionStatus ?? "free").toLowerCase() === "pro";
}
