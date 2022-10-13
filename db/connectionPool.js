const mysql = require('mysql');
const config = require('../config/config');

// 커넥션풀 세팅
const settingObj = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.connectionLimit
}

module.exports = (function () {
    let dbPool;
    
    const initiate = async () => {
        return await mysql.createPool(settingObj)
    }

    return {
        getPool: async function () {
            if (!dbPool) {
                dbPool = await initiate();
                return dbPool
            }
            else return dbPool;
        }
}
})();