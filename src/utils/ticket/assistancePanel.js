import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

export const ASSISTANCE_SELECT_CUSTOM_ID = 'assistance_select';

export const ASSISTANCE_TOPICS = [
    {
        value: 'partnerships',
        label: 'Partnerships',
        emoji: '🤝',
        description: 'Discuss partnership opportunities.',
        configKey: 'assistancePartnershipsMessage',
        defaultMessage: 'For partnership inquiries, please describe what you have in mind and our team will follow up with you.',
    },
    {
        value: 'general_support',
        label: 'General Support',
        emoji: '🛠️',
        description: 'Get help with general questions or issues.',
        configKey: 'assistanceGeneralSupportMessage',
        defaultMessage: 'For general support, please open a ticket or ask your question in the support channel.',
    },
    {
        value: 'management_support',
        label: 'Management Support',
        emoji: '📋',
        description: 'Reach out to server management.',
        configKey: 'assistanceManagementSupportMessage',
        defaultMessage: 'For management-related concerns, please reach out to the server management team.',
    },
];

export function getAssistanceTopic(value) {
    return ASSISTANCE_TOPICS.find((topic) => topic.value === value) || null;
}

export function getAssistanceMessage(guildConfig, topic) {
    return guildConfig?.[topic.configKey] || topic.defaultMessage;
}

export function buildAssistanceSelectRow() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(ASSISTANCE_SELECT_CUSTOM_ID)
        .setPlaceholder('Need assistance? Select a category...')
        .addOptions(
            ASSISTANCE_TOPICS.map((topic) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(topic.label)
                    .setDescription(topic.description)
                    .setValue(topic.value)
                    .setEmoji(topic.emoji),
            ),
        );

    return new ActionRowBuilder().addComponents(menu);
}
