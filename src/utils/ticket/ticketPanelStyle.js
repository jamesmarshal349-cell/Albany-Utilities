// Ticket panel branding — edit the values below to restyle the panel.
// No code changes needed elsewhere; just edit this file and redeploy.

import {
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
} from 'discord.js';
import { getColor } from '../../config/bot.js';

// Embed color (hex).
export const TICKET_PANEL_COLOR = '#FFD45E';

// Banner image shown above the ticket panel text. Must be a direct image URL.
export const TICKET_PANEL_BANNER_URL = 'https://cdn.tickety.top/images/1471477392412381205/ticketpanels/Isppkn6uSl4ohgF7y02/panelmessage/components/mtk39z2nrp0pok3.webp';

// Built with Components V2 (a Container) instead of a classic embed — this is the only
// way to get the banner to render above the text, since an embed's "image" field always
// renders at the bottom no matter what. `assistanceRow` is the ActionRow holding the
// assistance dropdown; pass null to build the container without it.
export function buildTicketPanelContainer(config, assistanceRow = null) {
    const container = new ContainerBuilder()
        .setAccentColor(getColor(TICKET_PANEL_COLOR))
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(TICKET_PANEL_BANNER_URL),
            ),
        );

    const message = config?.ticketPanelMessage || 'Select a category below to get started.';
    // Blank lines mark separate sections (e.g. the intro paragraph vs. each "## Topic"
    // block) — a separator goes before each one so every section is divided, not just
    // the text as a whole.
    const sections = message.split(/\n{2,}/).map((section) => section.trim()).filter(Boolean);

    for (const section of sections.length > 0 ? sections : [message]) {
        container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(section));
    }

    if (assistanceRow) {
        container
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(assistanceRow);
    }

    return container;
}

// Custom emoji for each assistance dropdown option.
//
// How to get the code Discord needs:
//   1. Discord Settings > Advanced > turn on "Developer Mode".
//   2. Type a backslash right before the emoji in any message box, e.g. "\:partner:",
//      and send it. Discord replaces your message with the raw code, like:
//      <:partner:123456789012345678>  (or <a:partner:123456789012345678> if it's animated)
//   3. Copy that whole "<...>" string and paste it below, replacing null.
//
// If the emoji lives in a different server than the one running this bot, this bot
// must also be a member of that server for Discord to render it — otherwise it will
// silently fail to show. Leave a value as null to show no emoji for that option.
export const ASSISTANCE_TOPIC_EMOJIS = {
    partnership_support: null,
    general_support: null,
    management_support: null,
};

function parseEmojiCode(code) {
    if (!code || typeof code !== 'string') return null;
    const match = /^<(a)?:(\w+):(\d+)>$/.exec(code.trim());
    if (!match) return null;
    return { animated: Boolean(match[1]), name: match[2], id: match[3] };
}

export function getAssistanceTopicEmoji(topicValue) {
    return parseEmojiCode(ASSISTANCE_TOPIC_EMOJIS[topicValue]);
}
