// commandManager.js
const { getUser, updateUser } = require('./userDatabase');
const { getActivePremium } = require('./premiumManager');
const { readDatabase, writeDatabase } = require('./utils/utils');

async function executeCommand(jid, command) {
    try {
        let user = await getUser(jid);

        if (!user) {
            return { success: false, message: "User not found" };
        }

        const { ReqEnergy, ReqTier, ReqCoin, CostCoin, Callname } = command;

        // Check Premium Tier
        const { isActive, tier } = getActivePremium(user);
        if (ReqTier && !isActive && tier !== ReqTier) {
            return { success: false, message: `Command ini membutuhkan tier premium ${ReqTier}.` };
        }

        // Check Energy
        if (ReqEnergy && user.energy < ReqEnergy) {
            return { success: false, message: "Energi tidak mencukupi!" };
        }

        // Check Coin
        if (ReqCoin === 'y' && user.coin < CostCoin) {
            return { success: false, message: "Coin tidak mencukupi!" };
        }

        // Calculate Updated Values
        const updateData = {};
        if (ReqEnergy) {
            updateData.energy = user.energy - ReqEnergy;
            if (updateData.energy < 0) updateData.energy = 0;  // Ensure energy doesn't go negative
        }
        if (ReqCoin === 'y') {
            updateData.coin = user.coin - CostCoin;
            if (updateData.coin < 0) updateData.coin = 0; // Ensure coin doesn't go negative
        }

        // Increase Command Usage
        const updatedCommandsUsed = { ...user.commandsUsed }; // Create a copy to avoid modifying the original
        updatedCommandsUsed[Callname] = (updatedCommandsUsed[Callname] || 0) + 1;
        updateData.commandsUsed = updatedCommandsUsed;

        // Update User in Database
        await updateUser(jid, updateData);

        // Update Bot Statistics (moved to separate function)
        await updateBotStats();

        // Retrieve Updated User Data
        const updatedUser = await getUser(jid);

        return { success: true, message: "Command digunakan", user: updatedUser };
    } catch (error) {
        console.error("Error in executeCommand:", error);
        return { success: false, message: "Terjadi kesalahan saat menjalankan perintah." };
    }
}

async function updateBotStats() {
    try {
        let db = await readDatabase();
        db.bot.totalCommandsUsed = (db.bot.totalCommandsUsed || 0) + 1;  // Ensure totalCommandsUsed exists
        await writeDatabase(db);
    } catch (error) {
        console.error("Error updating bot stats:", error); // Log the error but don't stop command execution
    }
}


module.exports = {
    executeCommand,
};