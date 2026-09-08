import { MessageFlags } from 'discord.js';
import { replyUserError, ErrorTypes } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { createAuthorizationUrl } from '../services/robloxVerificationService.js';
import { buildRobloxSignInReply } from '../utils/verification/robloxVerificationUi.js';
import { InteractionHelper } from '../utils/interactionHelper.js';

export async function handleVerificationButton(interaction, client) {
    try {
        if (!interaction.guild) {
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'This button can only be used in a server.' });
            return;
        }

        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) return;

        const authorizationUrl = await createAuthorizationUrl(interaction.user.id, interaction.guild.id);

        await InteractionHelper.safeEditReply(interaction, buildRobloxSignInReply(authorizationUrl));

        logger.debug('User started Roblox OAuth verification', {
            guildId: interaction.guild.id,
            userId: interaction.user.id,
        });
    } catch (error) {
        logger.error('Error starting Roblox verification:', error);
        if (interaction.deferred) {
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: error.userMessage || 'Could not start Roblox verification. Please try again.' }).catch(() => {});
        } else if (!interaction.replied) {
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Could not start Roblox verification. Please try again.' }).catch(() => {});
        }
    }
}

export default {
    customId: "verify_user",
    execute: handleVerificationButton
};
