/**
 * Service: estatísticas e planos do admin (Visão Geral).
 * Read-only: não guarda estado.
 */
const repository = require('./overview.repository');

async function getStats() {
    return repository.getStats();
}

async function getAdvancedStats() {
    const raw = await repository.getAdvancedStatsRaw();
    const activeUsers7d = parseInt(raw.activeUsers7d[0]?.count, 10) || 0;
    const activeToday = parseInt(raw.activeToday[0]?.count, 10) || 0;
    const loginsToday = parseInt(raw.loginsToday[0]?.count, 10) || 0;
    const modifiedToday = parseInt(raw.modifiedToday[0]?.count, 10) || 0;
    const expiredSubscriptions = parseInt(raw.expiredSubscriptions[0]?.count, 10) || 0;
    const expiringSoon = parseInt(raw.expiringSoon[0]?.count, 10) || 0;
    const usersWithProfile = parseInt(raw.usersWithProfile[0]?.count, 10) || 0;
    const totalLinks = parseInt(raw.totalLinks[0]?.count, 10) || 0;
    const usersLastActivity = raw.usersLastActivity || [];

    const notUsedToday = usersLastActivity.filter(u => !u.used_today || u.last_activity_date === null).length;
    const activeUsers = usersLastActivity.filter(u => {
        const isExpired = u.subscription_expires_at && new Date(u.subscription_expires_at) < new Date() && u.subscription_status !== 'free';
        return !isExpired;
    });
    const expiredUsers = usersLastActivity.filter(u => {
        const isExpired = u.subscription_expires_at && new Date(u.subscription_expires_at) < new Date() && u.subscription_status !== 'free';
        return isExpired;
    });

    return {
        activeUsers7d,
        activeUsersToday: activeToday,
        loginsToday,
        modifiedToday,
        expiredSubscriptions,
        expiringSoon,
        usersWithProfile,
        totalLinks,
        notUsedToday: notUsedToday || 0,
        activeUsersCount: activeUsers.length,
        expiredUsersCount: expiredUsers.length,
        usersActivity: usersLastActivity.map(u => ({
            id: u.id,
            email: u.email,
            displayName: u.display_name || u.email,
            subscriptionStatus: u.subscription_status,
            subscriptionExpiresAt: u.subscription_expires_at,
            lastActivityDate: u.last_activity_date,
            daysSinceLastActivity: u.days_since_last_activity,
            usedToday: u.used_today || false,
            isExpired: u.subscription_expires_at && new Date(u.subscription_expires_at) < new Date() && u.subscription_status !== 'free',
        })),
        activeUsersList: activeUsers.map(u => ({
            id: u.id,
            email: u.email,
            displayName: u.display_name || u.email,
            subscriptionStatus: u.subscription_status,
            subscriptionExpiresAt: u.subscription_expires_at,
            lastActivityDate: u.last_activity_date,
            daysSinceLastActivity: u.days_since_last_activity,
        })),
        expiredUsersList: expiredUsers.map(u => {
            let daysExpired = null;
            if (u.subscription_expires_at) {
                const expiresDate = new Date(u.subscription_expires_at);
                daysExpired = Math.floor((Date.now() - expiresDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            return {
                id: u.id,
                email: u.email,
                displayName: u.display_name || u.email,
                subscriptionStatus: u.subscription_status,
                subscriptionExpiresAt: u.subscription_expires_at,
                lastActivityDate: u.last_activity_date,
                daysSinceLastActivity: u.days_since_last_activity,
                daysExpired,
            };
        }),
    };
}

async function getAnalyticsUsers() {
    return repository.getAnalyticsUsers();
}

async function getAnalyticsUserDetails(userId, period) {
    return repository.getAnalyticsUserDetails(userId, period);
}

async function getPlans() {
    return repository.getPlans();
}

async function updatePlanKingBrief(planId, minutes) {
    return repository.updatePlanKingBrief(planId, minutes);
}

module.exports = {
    getStats,
    getAdvancedStats,
    getAnalyticsUsers,
    getAnalyticsUserDetails,
    getPlans,
    updatePlanKingBrief,
};
