// verificationPanelStyle.js — edit VERIFICATION_PANEL_COLOR below to restyle the
// panel's accent color. To change the banner image, replace
// src/assets/banners/verification-banner.png with a same-named file and redeploy.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
} from 'discord.js';
import { getColor } from '../../config/bot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANNER_PATH = join(__dirname, '../../assets/banners/verification-banner.png');
const BANNER_FILENAME = 'verification-banner.png';

export const VERIFICATION_PANEL_COLOR = '#FFD45E';
export const VERIFICATION_BUTTON_CUSTOM_ID = 'verify_user';

export function buildVerificationBannerAttachment() {
    return new AttachmentBuilder(readFileSync(BANNER_PATH), { name: BANNER_FILENAME });
}

export function buildVerificationPanelContainer(message, buttonText) {
    return new ContainerBuilder()
        .setAccentColor(getColor(VERIFICATION_PANEL_COLOR))
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(`attachment://${BANNER_FILENAME}`),
            ),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Getting Verified**\n${message}`),
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(VERIFICATION_BUTTON_CUSTOM_ID)
                    .setLabel(buttonText)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
            ),
        );
}
