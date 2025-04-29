async function createWhitelistRequest(db, discordId, pseudo) {
    // Vérifier si existe déjà
    const [rows] = await db.execute('SELECT * FROM whitelist_requests WHERE discord_user_id = ? AND status = "pending"', [discordId]);
    if (rows.length > 0) {
        return { success: false };
    }

    const [result] = await db.execute('INSERT INTO whitelist_requests (discord_user_id, pseudo_mc) VALUES (?, ?)', [discordId, pseudo]);
    return { success: true, requestId: result.insertId };
}

async function updateWhitelistRequest(db, id, status) {
    await db.execute('UPDATE whitelist_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
}

module.exports = { createWhitelistRequest, updateWhitelistRequest };