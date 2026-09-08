// helpers.js

import { BotConfig } from "../config/bot.js";

export function getPriorityMap() {
    const priorities = BotConfig.tickets?.priorities || {};
    const map = {};

    for (const [key, config] of Object.entries(priorities)) {
        map[key] = {
            name: `${config.emoji} ${config.label.toUpperCase()}`,
            color: config.color,
            emoji: config.emoji,
            label: config.label,
        };
    }

    return map;
}

export const PRIORITY_MAP = getPriorityMap();

// Discord channel names must be lowercase with no spaces; this keeps only
// alphanumerics and hyphens so arbitrary usernames/text are always safe to use.
export function sanitizeForChannelName(text, fallback = 'user') {
    const cleaned = String(text ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);

    return cleaned || fallback;
}
