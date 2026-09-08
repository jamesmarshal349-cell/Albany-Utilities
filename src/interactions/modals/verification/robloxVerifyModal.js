import { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../../utils/embeds.js';
import { getColor } from '../../../config/bot.js';
import { handleInteractionError } from '../../../utils/errorHandler.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { resolveRobloxUsername, startVerification } from '../../../services/robloxVerificationService.js';

export default {
    name: 'roblox_verify_modal',
    async execute(interaction, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) return;

        const username = interaction.fields.getTextInputValue('roblox_username').trim();

        try {
            const robloxUser = await resolveRobloxUsername(username);
            const code = await startVerification(interaction.user.id, robloxUser.id, robloxUser.name);

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('roblox_verify_confirm')
                    .setLabel("I've Added The Code")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
            );

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    createEmbed({
                        title: '🔗 Verify Your Roblox Account',
                        description: [
                            `Linking **${robloxUser.name}** (${robloxUser.displayName})`,
                            '',
                            '**Step 1:** Go to your Roblox profile → **Edit Profile** → **About**.',
                            `**Step 2:** Paste this code anywhere in your About/bio:\n\`\`\`${code}\`\`\``,
                            '**Step 3:** Click the button below once saved.',
                            '',
                            '_You can remove the code from your bio after verifying. This code expires in 10 minutes._',
                        ].join('\n'),
                        color: getColor('info'),
                    }),
                ],
                components: [confirmRow],
            });
        } catch (error) {
            await handleInteractionError(interaction, error, { commandName: 'roblox_verify_modal', source: 'roblox_verify_modal' });
        }
    },
};
