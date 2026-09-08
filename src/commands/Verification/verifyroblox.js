import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { successEmbed, createEmbed } from '../../utils/embeds.js';
import { getColor } from '../../config/bot.js';
import { replyUserError, ErrorTypes, handleInteractionError } from '../../utils/errorHandler.js';
import { setGuildConfig } from '../../services/config/guildConfig.js';
import {
    resolveRobloxUsername,
    fetchRobloxProfile,
    startVerification,
    getPendingVerification,
    clearPendingVerification,
    getRobloxLink,
    saveRobloxLink,
    removeRobloxLink,
} from '../../services/robloxVerificationService.js';
import { logger } from '../../utils/logger.js';

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
            return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: `You're already linked to **${existing.robloxUsername}**. Run \`/verifyroblox unlink\` first if you want to link a different account.` });
        }

        const robloxUser = await resolveRobloxUsername(username);
        const code = await startVerification(interaction.user.id, robloxUser.id, robloxUser.name);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                createEmbed({
                    title: '🔗 Verify Your Roblox Account',
                    description: [
                        `Linking **${robloxUser.name}** (${robloxUser.displayName})`,
                        '',
                        '**Step 1:** Go to your Roblox profile → **Edit Profile** → **About**.',
                        `**Step 2:** Paste this code anywhere in your About/bio:\n\`\`\`${code}\`\`\``,
                        '**Step 3:** Come back here and run `/verifyroblox confirm`.',
                        '',
                        '_You can remove the code from your bio after verifying. This code expires in 10 minutes._',
                    ].join('\n'),
                    color: getColor('info'),
                }),
            ],
        });
    } catch (error) {
        await handleInteractionError(interaction, error, { commandName: 'verifyroblox', source: 'verifyroblox_link' });
    }
}

async function handleConfirm(interaction, config) {
    const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
    if (!deferred) return;

    try {
        const pending = await getPendingVerification(interaction.user.id);

        if (!pending) {
            await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'You don\'t have a pending verification (or it expired). Run `/verifyroblox link` first.' });
            return;
        }

        const profile = await fetchRobloxProfile(pending.robloxId);
        const bio = profile?.description || '';

        if (!bio.includes(pending.code)) {
            await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: `I couldn't find the code **${pending.code}** in your Roblox "About" section yet. Make sure you saved your profile, then run \`/verifyroblox confirm\` again.` });
            return;
        }

        await saveRobloxLink(interaction.user.id, { robloxId: pending.robloxId, robloxUsername: pending.robloxUsername });
        await clearPendingVerification(interaction.user.id);

        const notes = [];

        try {
            await interaction.member.setNickname(pending.robloxUsername.slice(0, 32));
            notes.push('✅ Nickname updated.');
        } catch (nickError) {
            logger.warn(`Could not set nickname for ${interaction.user.id}: ${nickError.message}`);
            notes.push('⚠️ Could not update your nickname (I may be missing permission, or your role outranks mine).');
        }

        if (config.robloxVerifiedRoleId) {
            try {
                await interaction.member.roles.add(config.robloxVerifiedRoleId);
                notes.push('✅ Verified role granted.');
            } catch (roleError) {
                logger.warn(`Could not grant Roblox verified role to ${interaction.user.id}: ${roleError.message}`);
                notes.push('⚠️ Could not grant the verified role (check my role position and permissions).');
            }
        }

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed('✅ Roblox Account Verified', `Linked to **${pending.robloxUsername}**.\n\n${notes.join('\n')}`)],
        });
    } catch (error) {
        await handleInteractionError(interaction, error, { commandName: 'verifyroblox', source: 'verifyroblox_confirm' });
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
                .setDescription('Start linking a Roblox account')
                .addStringOption((option) =>
                    option
                        .setName('username')
                        .setDescription('Your Roblox username')
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('confirm')
                .setDescription('Finish linking after adding the code to your Roblox bio'),
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
        if (subcommand === 'confirm') {
            return handleConfirm(interaction, config);
        }
        if (subcommand === 'unlink') {
            return handleUnlink(interaction);
        }
    },
};
