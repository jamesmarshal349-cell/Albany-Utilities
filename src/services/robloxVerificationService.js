// robloxVerificationService.js
//
// Real Roblox account verification via OAuth 2.0 ("Sign in with Roblox").
// The user is sent to Roblox's own login/authorize page, so this proves they
// actually own the account — unlike a typed-username or bio-code check.
//
// Requires three environment variables, set on Roblox's Creator Hub
// (https://create.roblox.com/credentials) and then in Railway:
//   ROBLOX_OAUTH_CLIENT_ID
//   ROBLOX_OAUTH_CLIENT_SECRET
//   ROBLOX_OAUTH_REDIRECT_URI   (must exactly match what's registered on Roblox,
//                                 e.g. https://<your-app>.up.railway.app/auth/roblox/callback)

import crypto from 'crypto';
import { getFromDb, setInDb, deleteFromDb } from '../utils/database/wrapper.js';
import { getRobloxLinkKey, getRobloxOAuthStateKey } from '../utils/database/keys.js';
import { createError, ErrorTypes } from '../utils/errorHandler.js';

const STATE_TTL_SECONDS = 10 * 60; // 10 minutes
const OAUTH_BASE = 'https://apis.roblox.com/oauth';

function getOAuthConfig() {
    return {
        clientId: process.env.ROBLOX_OAUTH_CLIENT_ID || null,
        clientSecret: process.env.ROBLOX_OAUTH_CLIENT_SECRET || null,
        redirectUri: process.env.ROBLOX_OAUTH_REDIRECT_URI || null,
    };
}

export function isRobloxOAuthConfigured() {
    const { clientId, clientSecret, redirectUri } = getOAuthConfig();
    return Boolean(clientId && clientSecret && redirectUri);
}

// Creates a one-time state token tied to this Discord user/guild and returns
// the full Roblox authorize URL to send them to.
export async function createAuthorizationUrl(discordUserId, guildId) {
    const { clientId, redirectUri } = getOAuthConfig();

    if (!clientId || !redirectUri) {
        throw createError(
            'Roblox OAuth not configured',
            ErrorTypes.CONFIGURATION,
            'Roblox verification isn\'t fully set up yet on this server. Please contact a staff member.',
        );
    }

    const state = crypto.randomBytes(24).toString('hex');

    await setInDb(getRobloxOAuthStateKey(state), {
        discordUserId,
        guildId,
        createdAt: Date.now(),
    }, STATE_TTL_SECONDS);

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile',
        response_type: 'code',
        state,
    });

    return `${OAUTH_BASE}/v1/authorize?${params.toString()}`;
}

// One-time read: fetches and immediately deletes the pending state record.
export async function consumeOAuthState(state) {
    const record = await getFromDb(getRobloxOAuthStateKey(state), null);
    if (record) {
        await deleteFromDb(getRobloxOAuthStateKey(state));
    }
    return record;
}

export async function exchangeCodeForToken(code) {
    const { clientId, clientSecret, redirectUri } = getOAuthConfig();

    const body = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
    });

    let response;
    try {
        response = await fetch(`${OAUTH_BASE}/v1/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
    } catch (fetchError) {
        throw createError('Roblox token endpoint unreachable', ErrorTypes.UNKNOWN, 'Could not reach Roblox right now. Please try again in a moment.');
    }

    if (!response.ok) {
        throw createError(`Roblox token exchange failed (${response.status})`, ErrorTypes.UNKNOWN, 'Could not complete Roblox sign-in. Please try again.');
    }

    return response.json();
}

export async function fetchOAuthUserInfo(accessToken) {
    let response;
    try {
        response = await fetch(`${OAUTH_BASE}/v1/userinfo`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    } catch (fetchError) {
        throw createError('Roblox userinfo endpoint unreachable', ErrorTypes.UNKNOWN, 'Could not reach Roblox right now. Please try again in a moment.');
    }

    if (!response.ok) {
        throw createError(`Roblox userinfo failed (${response.status})`, ErrorTypes.UNKNOWN, 'Could not fetch your Roblox profile. Please try again.');
    }

    return response.json();
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
