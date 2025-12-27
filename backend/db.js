const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",       // your MySQL username
    password: "12345678",       // your MySQL password
    database: "clinic_db",
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Connected to MySQL database");
    }
});

module.exports = db;
