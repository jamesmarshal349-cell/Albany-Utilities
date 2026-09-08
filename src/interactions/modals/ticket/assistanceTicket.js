import { MessageFlags } from 'discord.js';
import { successEmbed } from '../../../utils/embeds.js';
import { createTicket } from '../../../services/ticket.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { getAssistanceTopic, getAssistanceCategoryId, ASSISTANCE_TICKET_MODAL_CUSTOM_ID } from '../../../utils/ticket/assistancePanel.js';
import { sanitizeForChannelName } from '../../../utils/helpers.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes, handleInteractionError } from '../../../utils/errorHandler.js';

export default {
    name: ASSISTANCE_TICKET_MODAL_CUSTOM_ID,
    async execute(interaction, client, args) {
        try {
            if (!interaction.inGuild()) {
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'This action can only be used in a server.' });
                return;
            }

            const topic = getAssistanceTopic(args?.[0]);
            if (!topic) {
                await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'That assistance option is not recognized.' });
                return;
            }

            const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
            if (!deferSuccess) return;

            const reason = interaction.fields.getTextInputValue('reason');
            const config = await getGuildConfig(client, interaction.guildId);
            const categoryId = getAssistanceCategoryId(config, topic);
            const namePrefix = `${sanitizeForChannelName(interaction.user.username)}-${topic.slug}`;

            const { channel } = await createTicket(
                interaction.guild,
                interaction.member,
                categoryId,
                `${topic.label}: ${reason}`,
                'none',
                { namePrefix },
            );

            await interaction.editReply({
                embeds: [successEmbed('Ticket Created', `Your **${topic.label}** ticket has been created in ${channel}!`)],
            });
        } catch (error) {
            await handleInteractionError(interaction, error, { type: 'modal', handler: 'assistance_ticket', customId: interaction.customId });
        }
    },
};
