// robloxVerificationService.js
//
// Links a Discord user to a Roblox account via a "bio code" challenge: the user
// is given a random code to paste into their Roblox profile's About/bio, and
// we confirm ownership by reading that (public, unauthenticated) profile back.
// No Roblox API key or OAuth app registration is required.

import { getFromDb, setInDb, deleteFromDb } from '../utils/database/wrapper.js';
import { getRobloxLinkKey, getRobloxPendingKey } from '../utils/database/keys.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';

const PENDING_TTL_SECONDS = 10 * 60; // 10 minutes
const ROBLOX_USERS_API = 'https://users.roblox.com/v1';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O or 1/I

function generateVerificationCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return `ALBANY-${code}`;
}

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

export async function fetchRobloxProfile(robloxId) {
    let response;
    try {
        response = await fetch(`${ROBLOX_USERS_API}/users/${robloxId}`);
    } catch (fetchError) {
        throw createError('Roblox API unreachable', ErrorTypes.UNKNOWN, 'Could not reach Roblox right now. Please try again in a moment.');
    }

    if (!response.ok) {
        throw createError(`Roblox API error (${response.status})`, ErrorTypes.UNKNOWN, 'Could not reach Roblox right now. Please try again in a moment.');
    }

    return response.json();
}

export async function startVerification(discordUserId, robloxId, robloxUsername) {
    const code = generateVerificationCode();

    await setInDb(getRobloxPendingKey(discordUserId), {
        robloxId,
        robloxUsername,
        code,
        createdAt: Date.now(),
    }, PENDING_TTL_SECONDS);

    return code;
}

export async function getPendingVerification(discordUserId) {
    return getFromDb(getRobloxPendingKey(discordUserId), null);
}

export async function clearPendingVerification(discordUserId) {
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
