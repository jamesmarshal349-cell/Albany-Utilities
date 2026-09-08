import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import { getColor } from '../../../config/bot.js';
import { successEmbed } from '../../../utils/embeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { getGuildConfig, setGuildConfig } from '../../../services/config/guildConfig.js';
import { ESCALATION_DEFAULTS } from '../../../services/moderation/escalationService.js';
import { startDashboardSession } from '../../../utils/dashboardSession.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';
import { logger } from '../../../utils/logger.js';

const THRESHOLD_FIELDS = {
    set_timeout: {
        title: '🔇 Set Timeout Threshold',
        countKey: 'moderationEscalationTimeoutThreshold',
        defaultCount: ESCALATION_DEFAULTS.timeoutThreshold,
        durationKey: 'moderationEscalationTimeoutDurationMs',
        defaultDurationMinutes: ESCALATION_DEFAULTS.timeoutDurationMs / 60000,
        label: 'timeout',
    },
    set_kick: {
        title: '👢 Set Kick Threshold',
        countKey: 'moderationEscalationKickThreshold',
        defaultCount: ESCALATION_DEFAULTS.kickThreshold,
        label: 'kick',
    },
    set_ban: {
        title: '🔨 Set Ban Threshold',
        countKey: 'moderationEscalationBanThreshold',
        defaultCount: ESCALATION_DEFAULTS.banThreshold,
        label: 'ban',
    },
};

function buildDashboardEmbed(config, guild) {
    const dmEnabled = config.moderationDmOnPunishment !== false;
    const escalationEnabled = !!config.moderationEscalationEnabled;

    const timeoutThreshold = config.moderationEscalationTimeoutThreshold ?? ESCALATION_DEFAULTS.timeoutThreshold;
    const timeoutDurationMinutes = Math.round((config.moderationEscalationTimeoutDurationMs ?? ESCALATION_DEFAULTS.timeoutDurationMs) / 60000);
    const kickThreshold = config.moderationEscalationKickThreshold ?? ESCALATION_DEFAULTS.kickThreshold;
    const banThreshold = config.moderationEscalationBanThreshold ?? ESCALATION_DEFAULTS.banThreshold;

    return new EmbedBuilder()
        .setTitle('🛡️ Moderation Settings Dashboard')
        .setDescription(`Manage moderation settings for **${guild.name}**.\nSelect an option below to modify a setting.`)
        .setColor(getColor('info'))
        .addFields(
            { name: 'Auto-DM on Punishment', value: dmEnabled ? 'Enabled' : 'Disabled', inline: true },
            { name: 'Warning Escalation', value: escalationEnabled ? 'Enabled' : 'Disabled', inline: true },
            { name: '​', value: '​', inline: true },
            { name: 'Timeout Threshold', value: `${timeoutThreshold} warnings (${timeoutDurationMinutes}m)`, inline: true },
            { name: 'Kick Threshold', value: `${kickThreshold} warnings`, inline: true },
            { name: 'Ban Threshold', value: `${banThreshold} warnings`, inline: true },
        )
        .setFooter({
            text: escalationEnabled
                ? 'Escalation is ON — the thresholds above trigger automatically.'
                : 'Escalation is OFF — warnings will not trigger automatic actions.',
        })
        .setTimestamp();
}

function buildSelectMenu() {
    return new StringSelectMenuBuilder()
        .setCustomId('moderation_config_select')
        .setPlaceholder('Select a setting to configure...')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Toggle Auto-DM on Punishment')
                .setDescription('DM users when warned, timed out, kicked, or banned')
                .setValue('toggle_dm')
                .setEmoji('📬'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Toggle Warning Escalation')
                .setDescription('Automatically timeout/kick/ban at warning thresholds')
                .setValue('toggle_escalation')
                .setEmoji('🚨'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Set Timeout Threshold')
                .setDescription('Warnings needed to trigger an automatic timeout')
                .setValue('set_timeout')
                .setEmoji('🔇'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Set Kick Threshold')
                .setDescription('Warnings needed to trigger an automatic kick')
                .setValue('set_kick')
                .setEmoji('👢'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Set Ban Threshold')
                .setDescription('Warnings needed to trigger an automatic ban')
                .setValue('set_ban')
                .setEmoji('🔨'),
        );
}

async function refreshDashboard(rootInteraction, guildConfig) {
    await InteractionHelper.safeEditReply(rootInteraction, {
        embeds: [buildDashboardEmbed(guildConfig, rootInteraction.guild)],
        components: [new ActionRowBuilder().addComponents(buildSelectMenu())],
    }).catch(() => {});
}

async function handleToggleDm(selectInteraction, rootInteraction, guildConfig, guildId, client) {
    await selectInteraction.deferUpdate();

    const newState = guildConfig.moderationDmOnPunishment === false;
    guildConfig.moderationDmOnPunishment = newState;
    await setGuildConfig(client, guildId, guildConfig);

    await selectInteraction.followUp({
        embeds: [successEmbed('Auto-DM Updated', `Users will **${newState ? 'now' : 'no longer'}** be DMed when warned, timed out, kicked, or banned.`)],
        flags: MessageFlags.Ephemeral,
    });

    await refreshDashboard(rootInteraction, guildConfig);
}

async function handleToggleEscalation(selectInteraction, rootInteraction, guildConfig, guildId, client) {
    await selectInteraction.deferUpdate();

    const newState = !guildConfig.moderationEscalationEnabled;
    guildConfig.moderationEscalationEnabled = newState;
    await setGuildConfig(client, guildId, guildConfig);

    await selectInteraction.followUp({
        embeds: [successEmbed(
            'Warning Escalation Updated',
            `Automatic escalation is now **${newState ? 'enabled' : 'disabled'}**.${newState ? '\n\nReview the thresholds on the dashboard to make sure they fit your server.' : ''}`,
        )],
        flags: MessageFlags.Ephemeral,
    });

    await refreshDashboard(rootInteraction, guildConfig);
}

async function handleThresholdModal(selectInteraction, rootInteraction, guildConfig, guildId, client, field) {
    const modalCustomId = `moderation_cfg_threshold_${field.label}`;
    const currentCount = guildConfig[field.countKey] ?? field.defaultCount;

    const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle(field.title);

    const countInput = new TextInputBuilder()
        .setCustomId('count_input')
        .setLabel('Warnings needed (1-50)')
        .setStyle(TextInputStyle.Short)
        .setValue(String(currentCount))
        .setMaxLength(2)
        .setMinLength(1)
        .setRequired(true)
        .setPlaceholder(String(field.defaultCount));

    modal.addComponents(new ActionRowBuilder().addComponents(countInput));

    if (field.durationKey) {
        const currentDurationMinutes = guildConfig[field.durationKey]
            ? Math.round(guildConfig[field.durationKey] / 60000)
            : field.defaultDurationMinutes;
        const durationInput = new TextInputBuilder()
            .setCustomId('duration_input')
            .setLabel('Timeout duration in minutes (1-40320)')
            .setStyle(TextInputStyle.Short)
            .setValue(String(currentDurationMinutes))
            .setMaxLength(5)
            .setMinLength(1)
            .setRequired(true)
            .setPlaceholder(String(field.defaultDurationMinutes));

        modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
    }

    await selectInteraction.showModal(modal);

    const submitted = await selectInteraction
        .awaitModalSubmit({
            filter: (i) => i.customId === modalCustomId && i.user.id === selectInteraction.user.id,
            time: 120_000,
        })
        .catch(() => null);

    if (!submitted) return;

    try {
        const rawCount = submitted.fields.getTextInputValue('count_input').trim();
        const count = parseInt(rawCount, 10);

        if (Number.isNaN(count) || count < 1 || count > 50) {
            await replyUserError(submitted, { type: ErrorTypes.VALIDATION, message: 'Warning count must be a whole number between **1** and **50**.' });
            return;
        }

        guildConfig[field.countKey] = count;

        let durationMinutes = null;
        if (field.durationKey) {
            const rawDuration = submitted.fields.getTextInputValue('duration_input').trim();
            durationMinutes = parseInt(rawDuration, 10);

            if (Number.isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 40320) {
                await replyUserError(submitted, { type: ErrorTypes.VALIDATION, message: 'Timeout duration must be a whole number of minutes between **1** and **40320** (28 days).' });
                return;
            }

            guildConfig[field.durationKey] = durationMinutes * 60000;
        }

        await setGuildConfig(client, guildId, guildConfig);

        const summary = durationMinutes
            ? `Timeout will now trigger at **${count}** warnings (duration: **${durationMinutes}** minutes).`
            : `**${field.label.charAt(0).toUpperCase() + field.label.slice(1)}** will now trigger at **${count}** warnings.`;

        await submitted.reply({
            embeds: [successEmbed(`✅ ${field.title.replace(/^\S+\s/, '')} Updated`, summary)],
            flags: MessageFlags.Ephemeral,
        });

        await refreshDashboard(rootInteraction, guildConfig);
    } catch (error) {
        logger.error('Failed to update moderation threshold:', { error: error.message, guildId, field: field.countKey });
        await replyUserError(submitted, { type: ErrorTypes.UNKNOWN, message: 'Could not save this setting. Please try again.' }).catch(() => {});
    }
}

export default {
    async execute(interaction, config, client) {
        try {
            const guildId = interaction.guild.id;
            const guildConfig = await getGuildConfig(client, guildId);

            const selectRow = new ActionRowBuilder().addComponents(buildSelectMenu());

            await startDashboardSession({
                interaction,
                embeds: [buildDashboardEmbed(guildConfig, interaction.guild)],
                components: [selectRow],
                selectMenuId: 'moderation_config_select',
                onSelect: async (selectInteraction) => {
                    const selected = selectInteraction.values[0];

                    if (THRESHOLD_FIELDS[selected]) {
                        await handleThresholdModal(selectInteraction, interaction, guildConfig, guildId, client, THRESHOLD_FIELDS[selected]);
                        return;
                    }

                    switch (selected) {
                        case 'toggle_dm':
                            await handleToggleDm(selectInteraction, interaction, guildConfig, guildId, client);
                            break;
                        case 'toggle_escalation':
                            await handleToggleEscalation(selectInteraction, interaction, guildConfig, guildId, client);
                            break;
                    }
                },
            });
        } catch (error) {
            logger.error('Unexpected error in moderation dashboard:', error);
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Failed to open the moderation settings dashboard.' }).catch(() => {});
        }
    },
};
