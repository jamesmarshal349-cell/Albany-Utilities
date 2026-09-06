// Ticket panel branding — edit the values below to restyle the panel.
// No code changes needed elsewhere; just edit this file and redeploy.

import { EmbedBuilder } from 'discord.js';

// Embed color (hex).
export const TICKET_PANEL_COLOR = '#FFD45E';

// Banner image shown above the ticket panel text. Must be a direct image URL.
export const TICKET_PANEL_BANNER_URL = 'https://cdn.tickety.top/images/1471477392412381205/ticketpanels/Isppkn6uSl4ohgF7y02/panelmessage/components/mtk39z2nrp0pok3.webp';

// Discord always renders an embed's "image" at the bottom of that embed — there's no
// setting to put it at the top. To get a banner-on-top look, we send it as its own
// embed (image only) immediately followed by the text embed, both the same color, so
// they read as one continuous card.
export function buildTicketPanelBannerEmbed() {
    return new EmbedBuilder()
        .setColor(TICKET_PANEL_COLOR)
        .setImage(TICKET_PANEL_BANNER_URL);
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
