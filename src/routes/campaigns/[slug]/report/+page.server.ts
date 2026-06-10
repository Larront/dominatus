import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { battleReportSchema } from '$lib/schemas/battle-report';
import { requireCampaignAccess } from '$lib/server/campaigns';
import { getWorldsWithControl } from '$lib/server/worlds';
import { getWarbandsForCampaign } from '$lib/server/warbands';
import { submitBattleReport, updateBattleReport, getReportForEdit } from '$lib/server/reports';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { campaign, role } = await parent();
	// Editing an existing report is an arbiter action, done from the admin panel (?edit=<id>).
	// A non-arbiter, or a bad id, falls back to a fresh create form rather than erroring.
	const editId = url.searchParams.get('edit');
	const existing =
		editId && role === 'arbiter' ? await getReportForEdit(editId, campaign.id) : null;
	const editing = existing ? editId : null;

	const [form, worlds, warbands] = await Promise.all([
		existing
			? superValidate(existing, zod4(battleReportSchema))
			: superValidate(zod4(battleReportSchema)),
		getWorldsWithControl(campaign.id),
		getWarbandsForCampaign(campaign.id)
	]);

	if (!existing) {
		// Seed defaults the commander confirms before submit. A CV draft will later
		// pre-fill these same fields (see ADR 0001); for now they start blank.
		form.data.cycle = campaign.currentCycle;
		// Each side's lead combatant carries the (in 2v2, shared) score; battle-ready
		// defaults on at +10 VP, so the commander only unticks an unpainted force.
		form.data.combatants = [
			{ side: 'attacker', warbandId: '', secondaries: [], battleReadyVp: 10 },
			{ side: 'defender', warbandId: '', secondaries: [], battleReadyVp: 10 }
		];
		// Outcome starts unset so the form never pre-declares a victor — the commander must choose.
		form.data.outcome = undefined as unknown as typeof form.data.outcome;
	}

	return {
		form,
		worlds,
		warbands,
		currentCycle: campaign.currentCycle,
		userId: locals.user?.id ?? null,
		editing
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals, url }) => {
		// Submission is gated to a logged-in member of this campaign.
		if (!locals.user) redirect(302, '/');
		const { campaign, role } = await requireCampaignAccess(params.slug, locals.user.id);

		const form = await superValidate(request, zod4(battleReportSchema));
		if (!form.valid) return fail(400, { form });

		// Trust the server's view, not the client: the world and every combatant warband
		// must belong to this campaign.
		const [worlds, warbands] = await Promise.all([
			getWorldsWithControl(campaign.id),
			getWarbandsForCampaign(campaign.id)
		]);
		if (!worlds.some((w) => w.id === form.data.worldId)) {
			return setError(form, 'worldId', 'That world is not part of this campaign');
		}
		const campaignWarbands = new Set(warbands.map((w) => w.id));
		if (!form.data.combatants.every((c) => campaignWarbands.has(c.warbandId))) {
			return setError(form, 'combatants._errors', 'A combatant is not part of this campaign');
		}

		// Edit path (?edit=<id>): arbiter-only amend + re-fold, then back to the admin panel.
		const editId = url.searchParams.get('edit');
		if (editId) {
			if (role !== 'arbiter') return fail(403, { form });
			updateBattleReport(editId, { ...form.data, campaignId: campaign.id });
			redirect(303, `/campaigns/${params.slug}/admin`);
		}

		// Create path: a new report is stamped with the campaign's current cycle and applied at once.
		submitBattleReport({
			...form.data,
			cycle: campaign.currentCycle,
			campaignId: campaign.id,
			submittedByUserId: locals.user.id
		});

		return message(form, 'Battle report logged. Control updated.');
	}
};
