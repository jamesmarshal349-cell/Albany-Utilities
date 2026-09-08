import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../embeds.js';
import { getColor } from '../../config/bot.js';

// A Link-style button needs no customId/handler — Discord just opens the URL
// client-side, no interaction is ever sent to the bot for it.
export function buildRobloxSignInReply(authorizationUrl) {
    const embed = createEmbed({
        title: 'Verify with Roblox',
        description: 'Click the button below to sign in with your Roblox account. You\'ll be verified automatically once you approve access.',
        color: getColor('info'),
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Sign in with Roblox')
            .setStyle(ButtonStyle.Link)
            .setURL(authorizationUrl)
            .setEmoji('🔗'),
    );

    return { embeds: [embed], components: [row] };
}
