const maria = require('mysql');
const config = require('../config/config');

const conn = maria.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database
});

module.exports = conn;