import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { getUserTicketCount } from '../../../services/ticket.js';
import { getAssistanceTopic, ASSISTANCE_TICKET_MODAL_CUSTOM_ID } from '../../../utils/ticket/assistancePanel.js';
import { checkRateLimit } from '../../../utils/rateLimiter.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';
import { logger } from '../../../utils/logger.js';

export default {
    name: 'assistance_select',
    async execute(interaction, client) {
        try {
            if (!interaction.inGuild()) {
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'This action can only be used in a server.' });
                return;
            }

            const topic = getAssistanceTopic(interaction.values[0]);
            if (!topic) {
                await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'That assistance option is not recognized.' });
                return;
            }

            const rateLimitKey = `${interaction.user.id}:create_ticket`;
            const allowed = await checkRateLimit(rateLimitKey, 3, 60000);
            if (!allowed) {
                await replyUserError(interaction, { type: ErrorTypes.RATE_LIMIT, message: 'You are creating tickets too quickly. Please wait a minute and try again.' });
                return;
            }

            const config = await getGuildConfig(client, interaction.guildId);
            const maxTicketsPerUser = config.maxTicketsPerUser || 3;
            const currentTicketCount = await getUserTicketCount(interaction.guildId, interaction.user.id);

            if (currentTicketCount >= maxTicketsPerUser) {
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `You have reached the maximum number of open tickets (${maxTicketsPerUser}).\n\nPlease close your existing tickets before creating a new one.\n\n**Current Tickets:** ${currentTicketCount}/${maxTicketsPerUser}` });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId(`${ASSISTANCE_TICKET_MODAL_CUSTOM_ID}:${topic.value}`)
                .setTitle(topic.label.slice(0, 45));

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('What do you need help with?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Describe your request...')
                .setRequired(true)
                .setMaxLength(1000);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

            await interaction.showModal(modal);
        } catch (error) {
            logger.error('Error opening assistance ticket modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Could not open the ticket creation form.' });
            }
        }
    },
};
