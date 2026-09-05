import { MessageFlags } from 'discord.js';
import { getColor } from '../../../config/bot.js';
import { createEmbed } from '../../../utils/embeds.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { getAssistanceTopic, getAssistanceMessage } from '../../../utils/ticket/assistancePanel.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';
import { logger } from '../../../utils/logger.js';

export default {
    name: 'assistance_select',
    async execute(interaction, client) {
        try {
            const topic = getAssistanceTopic(interaction.values[0]);

            if (!topic) {
                await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'That assistance option is not recognized.' });
                return;
            }

            const guildConfig = interaction.guildId ? await getGuildConfig(client, interaction.guildId) : null;
            const message = getAssistanceMessage(guildConfig, topic);

            await interaction.reply({
                embeds: [createEmbed({ title: topic.label, description: message, color: getColor('info') })],
                flags: MessageFlags.Ephemeral,
            });

            logger.info('Assistance topic selected', {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                topic: topic.value,
            });
        } catch (error) {
            logger.error('Error handling assistance select menu:', error);
            if (!interaction.replied && !interaction.deferred) {
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Could not load assistance information.' });
            }
        }
    },
};
