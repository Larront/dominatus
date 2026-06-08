import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { battleReportSchema } from '$lib/schemas/battle-report';
import { getWorldsWithControl } from '$lib/server/worlds';
import { getWarbandsForCampaign } from '$lib/server/warbands';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { campaign } = await parent();
	const [form, worlds, warbands] = await Promise.all([
		superValidate(zod4(battleReportSchema)),
		getWorldsWithControl(campaign.id),
		getWarbandsForCampaign(campaign.id)
	]);
	// Seed defaults the commander confirms before submit. A CV draft will later
	// pre-fill these same fields (see ADR 0001); for now they start blank.
	form.data.cycle = campaign.currentCycle;
	form.data.combatants = [
		{ side: 'attacker', warbandId: '' },
		{ side: 'defender', warbandId: '' }
	];
	return { form, worlds, warbands, currentCycle: campaign.currentCycle };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod4(battleReportSchema));
		if (!form.valid) return fail(400, { form });

		// TODO: persist the battle report + combatants, then recompute world control.
		// Control-shift rules are deferred — see CONTEXT.md / pending rules decision.
		return message(form, 'Report received (persistence not yet wired).');
	}
};
