import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { successEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes, handleInteractionError } from '../../utils/errorHandler.js';
import { setGuildConfig } from '../../services/config/guildConfig.js';
import {
    resolveRobloxUsername,
    fetchRobloxAvatarUrl,
    setPendingLink,
    getRobloxLink,
    removeRobloxLink,
} from '../../services/robloxVerificationService.js';
import { buildRobloxConfirmReply } from '../../utils/verification/robloxVerificationUi.js';

async function handleSetup(interaction, config, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'You need the **Manage Server** permission to configure this.' });
    }

    const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
    if (!deferred) return;

    const role = interaction.options.getRole('role');
    config.robloxVerifiedRoleId = role.id;
    await setGuildConfig(client, interaction.guildId, config);

    await InteractionHelper.safeEditReply(interaction, {
        embeds: [successEmbed('Roblox Verification Configured', `Members will be granted ${role} once they verify their Roblox account.`)],
    });
}

async function handleLink(interaction) {
    const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
    if (!deferred) return;

    const username = interaction.options.getString('username');

    try {
        const existing = await getRobloxLink(interaction.user.id);
        if (existing) {
            await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: `You're already linked to **${existing.robloxUsername}**. Run \`/verifyroblox unlink\` first if you want to link a different account.` });
            return;
        }

        const robloxUser = await resolveRobloxUsername(username);
        const avatarUrl = await fetchRobloxAvatarUrl(robloxUser.id);

        await setPendingLink(interaction.user.id, { robloxId: robloxUser.id, robloxUsername: robloxUser.name });

        await InteractionHelper.safeEditReply(interaction, buildRobloxConfirmReply(robloxUser, avatarUrl));
    } catch (error) {
        await handleInteractionError(interaction, error, { commandName: 'verifyroblox', source: 'verifyroblox_link' });
    }
}

async function handleUnlink(interaction) {
    const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
    if (!deferred) return;

    const existing = await getRobloxLink(interaction.user.id);
    if (!existing) {
        await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'You don\'t have a linked Roblox account.' });
        return;
    }

    await removeRobloxLink(interaction.user.id);

    await InteractionHelper.safeEditReply(interaction, {
        embeds: [successEmbed('Unlinked', `Your Roblox account (**${existing.robloxUsername}**) has been unlinked. This did not change your nickname or roles.`)],
    });
}

export default {
    data: new SlashCommandBuilder()
        .setName('verifyroblox')
        .setDescription('Link your Roblox account to Discord.')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('link')
                .setDescription('Link a Roblox account')
                .addStringOption((option) =>
                    option
                        .setName('username')
                        .setDescription('Your Roblox username')
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('unlink')
                .setDescription('Remove your linked Roblox account'),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('setup')
                .setDescription('(Admin) Set the role granted on Roblox verification')
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('Role to grant once a member verifies')
                        .setRequired(true),
                ),
        ),
    category: 'verification',

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            return handleSetup(interaction, config, client);
        }
        if (subcommand === 'link') {
            return handleLink(interaction);
        }
        if (subcommand === 'unlink') {
            return handleUnlink(interaction);
        }
    },
};
