import {
	convexAuthNextjsMiddleware,
	createRouteMatcher,
	nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
	const authenticated = await convexAuth.isAuthenticated();

	// Signed-in users hitting the sign-in page go to the dashboard.
	if (isSignInPage(request) && authenticated) {
		return nextjsMiddlewareRedirect(request, "/practices");
	}

	// Everything except the sign-in page requires authentication.
	if (!isSignInPage(request) && !authenticated) {
		return nextjsMiddlewareRedirect(request, "/signin");
	}
});

export const config = {
	// Run on all routes except Next.js internals and static files.
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
