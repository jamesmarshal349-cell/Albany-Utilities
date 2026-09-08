import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { getAssistanceTopicEmoji } from './ticketPanelStyle.js';

export const ASSISTANCE_SELECT_CUSTOM_ID = 'assistance_select';
export const ASSISTANCE_TICKET_MODAL_CUSTOM_ID = 'assistance_ticket_modal';

export const ASSISTANCE_TOPICS = [
    {
        value: 'partnership_support',
        label: 'Partnership Support',
        description: 'Discuss partnership opportunities.',
        slug: 'partnership',
        categoryConfigKey: 'partnershipCategoryId',
    },
    {
        value: 'general_support',
        label: 'General Support',
        description: 'Get help with general questions or issues.',
        slug: 'general',
        categoryConfigKey: 'generalCategoryId',
    },
    {
        value: 'management_support',
        label: 'Management Support',
        description: 'Reach out to server management.',
        slug: 'management',
        categoryConfigKey: 'managementCategoryId',
    },
];

export function getAssistanceTopic(value) {
    return ASSISTANCE_TOPICS.find((topic) => topic.value === value) || null;
}

// Falls back to the general ticket category if no category is configured for this topic.
export function getAssistanceCategoryId(guildConfig, topic) {
    return guildConfig?.assistanceCategoryIds?.[topic.categoryConfigKey] || guildConfig?.ticketCategoryId || null;
}

export function buildAssistanceSelectRow() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(ASSISTANCE_SELECT_CUSTOM_ID)
        .setPlaceholder('Need assistance? Select a category...')
        .addOptions(
            ASSISTANCE_TOPICS.map((topic) => {
                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(topic.label)
                    .setDescription(topic.description)
                    .setValue(topic.value);

                const emoji = getAssistanceTopicEmoji(topic.value);
                if (emoji) option.setEmoji(emoji);

                return option;
            }),
        );

    return new ActionRowBuilder().addComponents(menu);
}
