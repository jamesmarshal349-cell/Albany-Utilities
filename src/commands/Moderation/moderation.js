import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import moderationDashboard from './modules/moderation_dashboard.js';

export default {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription("Manage this server's moderation settings.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('dashboard')
                .setDescription('Open the interactive moderation settings dashboard'),
        ),
    category: 'moderation',

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            logger.warn('Moderation dashboard permission denied', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'moderation',
            });
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'You need the `Moderate Members` permission for this action.' });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'dashboard') {
            return moderationDashboard.execute(interaction, config, client);
        }
    },
};
