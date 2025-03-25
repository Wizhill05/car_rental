import sqlite3 from "sqlite3";

const DBSOURCE = "rental.db";
const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Connected to SQLite database.");

    // Create cars table
    db.run(
      `CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        rate_per_day REAL NOT NULL,
        available BOOLEAN DEFAULT 1
      )`
    );

    // Create users table
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        license_no TEXT UNIQUE NOT NULL
      )`
    );

    // Create rentals table with foreign key constraints
    db.run(
      `CREATE TABLE IF NOT EXISTS rentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        car_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        total_amount REAL NOT NULL,
        active BOOLEAN DEFAULT 1,
        FOREIGN KEY(car_id) REFERENCES cars(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    // Create reviews table with foreign key constraint
    db.run(
      `CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rental_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(rental_id) REFERENCES rentals(id) ON DELETE CASCADE
      )`
    );
  }
});

export default db;
