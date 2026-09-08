import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { replyUserError, ErrorTypes } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { getRobloxLink } from '../services/robloxVerificationService.js';

export async function handleVerificationButton(interaction, client) {
    try {
        if (!interaction.guild) {
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'This button can only be used in a server.' });
            return;
        }

        const existing = await getRobloxLink(interaction.user.id);
        if (existing) {
            await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: `You're already linked to Roblox account **${existing.robloxUsername}**. Ask a staff member to unlink you first if you need to re-verify.` });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('roblox_verify_modal')
            .setTitle('Roblox Verification');

        const usernameInput = new TextInputBuilder()
            .setCustomId('roblox_username')
            .setLabel('Your Roblox Username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. Builderman')
            .setRequired(true)
            .setMaxLength(50);

        modal.addComponents(new ActionRowBuilder().addComponents(usernameInput));

        await interaction.showModal(modal);

        logger.debug('User opened Roblox verification modal', {
            guildId: interaction.guild.id,
            userId: interaction.user.id,
        });
    } catch (error) {
        logger.error('Error opening Roblox verification modal:', error);
        if (!interaction.replied && !interaction.deferred) {
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Could not open the verification form.' }).catch(() => {});
        }
    }
}

export default {
    customId: "verify_user",
    execute: handleVerificationButton
};
