// robloxVerificationService.js
//
// Links a Discord user to a Roblox account: they type a Roblox username, see
// that account's avatar to confirm it's the right one, and click confirm.
// There is no ownership proof step (no bio code, no OAuth) — this is an
// identity link, not a cryptographic verification.

import { getFromDb, setInDb, deleteFromDb } from '../utils/database/wrapper.js';
import { getRobloxLinkKey, getRobloxPendingKey } from '../utils/database/keys.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';

const PENDING_TTL_SECONDS = 10 * 60; // 10 minutes
const ROBLOX_USERS_API = 'https://users.roblox.com/v1';
const ROBLOX_THUMBNAILS_API = 'https://thumbnails.roblox.com/v1';

export async function resolveRobloxUsername(username) {
    let response;
    try {
        response = await fetch(`${ROBLOX_USERS_API}/usernames/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
        });
    } catch (fetchError) {
        throw createError('Roblox API unreachable', ErrorTypes.UNKNOWN, 'Could not reach Roblox right now. Please try again in a moment.');
    }

    if (!response.ok) {
        throw createError(`Roblox API error (${response.status})`, ErrorTypes.UNKNOWN, 'Could not reach Roblox right now. Please try again in a moment.');
    }

    const data = await response.json();
    const match = data?.data?.[0];

    if (!match) {
        throw createError('Roblox user not found', ErrorTypes.VALIDATION, `Could not find a Roblox account named "${username}". Double-check the spelling.`);
    }

    return { id: match.id, name: match.name, displayName: match.displayName };
}

export async function fetchRobloxAvatarUrl(robloxId) {
    try {
        const response = await fetch(`${ROBLOX_THUMBNAILS_API}/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`);
        if (!response.ok) return null;

        const data = await response.json();
        const entry = data?.data?.[0];
        return entry?.state === 'Completed' ? entry.imageUrl : null;
    } catch (error) {
        return null;
    }
}

export async function setPendingLink(discordUserId, { robloxId, robloxUsername }) {
    await setInDb(getRobloxPendingKey(discordUserId), {
        robloxId,
        robloxUsername,
        createdAt: Date.now(),
    }, PENDING_TTL_SECONDS);
}

export async function getPendingLink(discordUserId) {
    return getFromDb(getRobloxPendingKey(discordUserId), null);
}

export async function clearPendingLink(discordUserId) {
    return deleteFromDb(getRobloxPendingKey(discordUserId));
}

export async function getRobloxLink(discordUserId) {
    return getFromDb(getRobloxLinkKey(discordUserId), null);
}

export async function saveRobloxLink(discordUserId, { robloxId, robloxUsername }) {
    const record = {
        robloxId,
        robloxUsername,
        verifiedAt: new Date().toISOString(),
    };

    await setInDb(getRobloxLinkKey(discordUserId), record);
    return record;
}

export async function removeRobloxLink(discordUserId) {
    return deleteFromDb(getRobloxLinkKey(discordUserId));
}
