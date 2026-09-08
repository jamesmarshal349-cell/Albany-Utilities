import { MessageFlags } from 'discord.js';
import { successEmbed } from '../../../utils/embeds.js';
import { replyUserError, ErrorTypes, handleInteractionError } from '../../../utils/errorHandler.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';
import {
    getPendingLink,
    saveRobloxLink,
    clearPendingLink,
} from '../../../services/robloxVerificationService.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';

export default {
    name: 'roblox_verify_confirm',
    async execute(interaction, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) return;

        try {
            const pending = await getPendingLink(interaction.user.id);

            if (!pending) {
                await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Your verification session expired or was not found. Click the **Verify** button again to restart.' });
                return;
            }

            await saveRobloxLink(interaction.user.id, { robloxId: pending.robloxId, robloxUsername: pending.robloxUsername });
            await clearPendingLink(interaction.user.id);

            const notes = [];

            try {
                await interaction.member.setNickname(pending.robloxUsername.slice(0, 32));
                notes.push('✅ Nickname updated.');
            } catch (nickError) {
                logger.warn(`Could not set nickname for ${interaction.user.id}: ${nickError.message}`);
                notes.push('⚠️ Could not update your nickname (I may be missing permission, or your role outranks mine).');
            }

            const config = await getGuildConfig(client, interaction.guildId);
            const roleId = config.verification?.roleId || config.robloxVerifiedRoleId;

            if (roleId) {
                try {
                    await interaction.member.roles.add(roleId);
                    notes.push('✅ Verified role granted.');
                } catch (roleError) {
                    logger.warn(`Could not grant verified role to ${interaction.user.id}: ${roleError.message}`);
                    notes.push('⚠️ Could not grant the verified role (check my role position and permissions).');
                }
            }

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed('✅ Verified', `Linked to **${pending.robloxUsername}**.\n\n${notes.join('\n')}`)],
            });
        } catch (error) {
            await handleInteractionError(interaction, error, { commandName: 'roblox_verify_confirm', source: 'roblox_verify_confirm' });
        }
    },
};
