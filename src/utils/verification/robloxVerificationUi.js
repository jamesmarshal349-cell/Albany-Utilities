import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../embeds.js';
import { getColor } from '../../config/bot.js';

export const ROBLOX_CONFIRM_BUTTON_ID = 'roblox_verify_confirm';

export function buildRobloxConfirmReply(robloxUser, avatarUrl) {
    const nameLine = robloxUser.displayName && robloxUser.displayName !== robloxUser.name
        ? `**${robloxUser.name}** (${robloxUser.displayName})`
        : `**${robloxUser.name}**`;

    const embed = createEmbed({
        title: 'Is this you?',
        description: nameLine,
        color: getColor('info'),
        thumbnail: avatarUrl || null,
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(ROBLOX_CONFIRM_BUTTON_ID)
            .setLabel("Yes, that's me")
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
    );

    return { embeds: [embed], components: [row] };
}
