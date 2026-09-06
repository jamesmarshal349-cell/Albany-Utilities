import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

export const ASSISTANCE_SELECT_CUSTOM_ID = 'assistance_select';
export const ASSISTANCE_TICKET_MODAL_CUSTOM_ID = 'assistance_ticket_modal';

export const ASSISTANCE_TOPICS = [
    {
        value: 'partnership_support',
        label: 'Partnership Support',
        description: 'Discuss partnership opportunities.',
    },
    {
        value: 'general_support',
        label: 'General Support',
        description: 'Get help with general questions or issues.',
    },
    {
        value: 'management_support',
        label: 'Management Support',
        description: 'Reach out to server management.',
    },
];

export function getAssistanceTopic(value) {
    return ASSISTANCE_TOPICS.find((topic) => topic.value === value) || null;
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
                    .setValue(topic.value),
            ),
        );

    return new ActionRowBuilder().addComponents(menu);
}
