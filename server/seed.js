import sqlite3 from "sqlite3";
const db = new sqlite3.Database("rental.db");

// Sample car data
const cars = [
  {
    name: "Toyota Camry",
    type: "economy",
    rate_per_day: 50.0,
  },
  {
    name: "Honda CR-V",
    type: "suv",
    rate_per_day: 65.0,
  },
  {
    name: "BMW 3 Series",
    type: "luxury",
    rate_per_day: 85.0,
  },
  {
    name: "Ford Focus",
    type: "economy",
    rate_per_day: 45.0,
  },
  {
    name: "Mercedes E-Class",
    type: "luxury",
    rate_per_day: 90.0,
  },
];

// Insert sample cars
db.serialize(() => {
  // Clear existing data
  db.run("DELETE FROM cars");
  db.run("DELETE FROM users");
  db.run("DELETE FROM rentals");
  db.run("DELETE FROM reviews");

  // Insert new cars
  const stmt = db.prepare(
    "INSERT INTO cars (name, type, rate_per_day) VALUES (?, ?, ?)"
  );
  cars.forEach((car) => {
    stmt.run(car.name, car.type, car.rate_per_day);
  });
  stmt.finalize();

  console.log("Sample data has been inserted successfully!");
});

db.close();
