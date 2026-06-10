import type { PageLoad } from './$types';

// better-auth mails a link to /reset-password?token=…, and on a spent or malformed link it
// redirects here with ?error=… instead. Read both at load so the page can show the right face
// before the user types anything.
export const load: PageLoad = ({ url }) => {
	return {
		token: url.searchParams.get('token'),
		tokenError: url.searchParams.get('error')
	};
};
