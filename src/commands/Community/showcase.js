import {
    SlashCommandBuilder,
    ChannelType,
    MessageFlags,
    AttachmentBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
} from 'discord.js';
import { getColor } from '../../config/bot.js';
import { TICKET_PANEL_COLOR } from '../../utils/ticket/ticketPanelStyle.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { successEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes, handleInteractionError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('showcase')
        .setDescription('Post an image to a channel, credited to you.')
        .addAttachmentOption((option) =>
            option
                .setName('image')
                .setDescription('The image to showcase')
                .setRequired(true),
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to post it in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true),
        ),
    category: 'community',

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) return;

        const attachment = interaction.options.getAttachment('image');
        const targetChannel = interaction.options.getChannel('channel');

        if (!attachment.contentType?.startsWith('image/')) {
            return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Please attach an image file.' });
        }

        const botPerms = targetChannel.permissionsFor(interaction.guild.members.me);
        if (!botPerms?.has(['ViewChannel', 'SendMessages', 'AttachFiles'])) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: `I need **View Channel**, **Send Messages**, and **Attach Files** in ${targetChannel}.` });
        }

        try {
            const response = await fetch(attachment.url);
            if (!response.ok) {
                throw new Error(`Failed to download attachment (${response.status})`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            const fileName = attachment.name || 'showcase.png';
            const file = new AttachmentBuilder(buffer, { name: fileName });

            const container = new ContainerBuilder()
                .setAccentColor(getColor(TICKET_PANEL_COLOR))
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(
                        new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`),
                    ),
                );

            const sentMessage = await targetChannel.send({
                components: [container],
                files: [file],
                flags: MessageFlags.IsComponentsV2,
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        'Showcased!',
                        `Your image has been posted in ${targetChannel}.\n[Jump to message](${sentMessage.url})`,
                    ),
                ],
            });
        } catch (error) {
            logger.error('Error posting showcase:', error);
            await handleInteractionError(interaction, error, { commandName: 'showcase', source: 'showcase_command' });
        }
    },
};
