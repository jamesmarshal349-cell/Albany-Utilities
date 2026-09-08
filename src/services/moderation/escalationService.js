// escalationService.js
//
// Automatically escalates a user to timeout/kick/ban once their active warning
// count reaches a configured threshold. Disabled by default — an admin must
// turn it on (and can tune the thresholds) from /moderation dashboard.

import { getGuildConfig } from '../config/guildConfig.js';
import { ModerationService } from './moderationService.js';
import { logger } from '../../utils/logger.js';

export const ESCALATION_DEFAULTS = {
  timeoutThreshold: 3,
  timeoutDurationMs: 60 * 60 * 1000, // 1 hour
  kickThreshold: 5,
  banThreshold: 7,
};

// Returns { action: 'timeout' | 'kick' | 'ban', ... } if an action was taken, else null.
export async function maybeEscalateWarning({ guild, member, activeWarningCount }) {
  try {
    const config = await getGuildConfig(guild.client, guild.id);
    if (!config.moderationEscalationEnabled) return null;

    const botMember = guild.members.me;
    if (!botMember) return null;

    const timeoutThreshold = config.moderationEscalationTimeoutThreshold ?? ESCALATION_DEFAULTS.timeoutThreshold;
    const timeoutDurationMs = config.moderationEscalationTimeoutDurationMs ?? ESCALATION_DEFAULTS.timeoutDurationMs;
    const kickThreshold = config.moderationEscalationKickThreshold ?? ESCALATION_DEFAULTS.kickThreshold;
    const banThreshold = config.moderationEscalationBanThreshold ?? ESCALATION_DEFAULTS.banThreshold;

    const reason = `Automatic escalation: reached ${activeWarningCount} active warning${activeWarningCount !== 1 ? 's' : ''}`;

    if (activeWarningCount === banThreshold) {
      const result = await ModerationService.banUser({ guild, user: member.user, moderator: botMember, reason });
      return { action: 'ban', threshold: banThreshold, ...result };
    }

    if (activeWarningCount === kickThreshold) {
      const result = await ModerationService.kickUser({ guild, member, moderator: botMember, reason });
      return { action: 'kick', threshold: kickThreshold, ...result };
    }

    if (activeWarningCount === timeoutThreshold) {
      const result = await ModerationService.timeoutUser({ guild, member, moderator: botMember, durationMs: timeoutDurationMs, reason });
      return { action: 'timeout', threshold: timeoutThreshold, ...result };
    }

    return null;
  } catch (error) {
    logger.error(`Warning escalation failed for ${member?.id} in ${guild?.id}: ${error.message}`);
    return null;
  }
}
