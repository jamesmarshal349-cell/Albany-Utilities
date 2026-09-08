import { MessageFlags } from 'discord.js';
import { handleInteractionError } from '../../../utils/errorHandler.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { resolveRobloxUsername, fetchRobloxAvatarUrl, setPendingLink } from '../../../services/robloxVerificationService.js';
import { buildRobloxConfirmReply } from '../../../utils/verification/robloxVerificationUi.js';

export default {
    name: 'roblox_verify_modal',
    async execute(interaction, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) return;

        const username = interaction.fields.getTextInputValue('roblox_username').trim();

        try {
            const robloxUser = await resolveRobloxUsername(username);
            const avatarUrl = await fetchRobloxAvatarUrl(robloxUser.id);

            await setPendingLink(interaction.user.id, { robloxId: robloxUser.id, robloxUsername: robloxUser.name });

            await InteractionHelper.safeEditReply(interaction, buildRobloxConfirmReply(robloxUser, avatarUrl));
        } catch (error) {
            await handleInteractionError(interaction, error, { commandName: 'roblox_verify_modal', source: 'roblox_verify_modal' });
        }
    },
};
