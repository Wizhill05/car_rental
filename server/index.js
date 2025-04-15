import express from "express";
import cors from "cors";
import db from "./db.js";
import nodemailer from "nodemailer";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.log("Error verifying email configuration:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Function to send email
const sendEmail = async (to, subject, text) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Email credentials are missing. Please check your .env file.");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Car Rental Service" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    if (error.code === 'EAUTH') {
      console.error("Authentication failed. Please check your email credentials.");
    }
  }
};

// Function to check for expiring rentals and send notifications
const checkExpiringRentals = (daysAhead = 1) => {
  return new Promise((resolve, reject) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    db.all(
      `SELECT r.*, u.email, u.name as user_name, c.name as car_name
       FROM rentals r
       JOIN users u ON r.user_id = u.id
       JOIN cars c ON r.car_id = c.id
       WHERE r.end_date = ? AND r.active = 1`,
      [targetDateStr],
      (err, rows) => {
        if (err) {
          console.error("Error checking expiring rentals:", err);
          reject(err);
          return;
        }

        const emailPromises = rows.map(rental => 
          sendEmail(
            rental.email,
            "Your car rental is expiring soon",
            `Dear ${rental.user_name},\n\nYour rental for ${rental.car_name} is expiring on ${rental.end_date}. Please ensure to return the vehicle on time.\n\nThank you for using our service!`
          )
        );

        Promise.all(emailPromises)
          .then(() => resolve(rows.length))
          .catch(reject);
      }
    );
  });
};

// Schedule the expiring rentals check to run daily at midnight
cron.schedule('0 0 * * *', () => {
  checkExpiringRentals(1)
    .then(count => console.log(`Sent ${count} expiration reminder emails`))
    .catch(err => console.error("Error in scheduled expiration check:", err));
});

// New endpoint to manually trigger expiration emails
app.post("/api/send-expiration-emails", async (req, res) => {
  try {
    const today = await checkExpiringRentals(0);
    const tomorrow = await checkExpiringRentals(1);
    const dayAfterTomorrow = await checkExpiringRentals(2);
    
    const totalSent = today + tomorrow + dayAfterTomorrow;
    res.json({ message: `Sent ${totalSent} expiration reminder emails` });
  } catch (error) {
    console.error("Error sending expiration emails:", error);
    res.status(500).json({ error: "Failed to send expiration emails" });
  }
});

// Helper function to get car by id
const getCar = (id) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM cars WHERE id = ?", [id], (err, row) => {
      if (err) reject(err);
      if (!row) reject(new Error("Car not found"));
      resolve(row);
    });
  });
};

// Helper function to get user by id
const getUser = (id) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
      if (err) reject(err);
      if (!row) reject(new Error("User not found"));
      resolve(row);
    });
  });
};

// Helper function to calculate rental fee
const calculateRentalFee = (startDate, endDate, ratePerDay) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return days * ratePerDay;
};

// CAR ENDPOINTS

// Get all cars
app.get("/api/cars", (req, res) => {
  db.all("SELECT * FROM cars", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get available cars
app.get("/api/cars/available", (req, res) => {
  db.all("SELECT * FROM cars WHERE available = 1", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add new car
app.post("/api/cars", (req, res) => {
  const { name, type, rate_per_day } = req.body;
  if (!name || !type || !rate_per_day) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    "INSERT INTO cars (name, type, rate_per_day) VALUES (?, ?, ?)",
    [name, type, rate_per_day],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

// USER ENDPOINTS

// Register new user
app.post("/api/users", async (req, res) => {
  const { name, phone, license_no, email } = req.body;
  if (!name || !phone || !license_no || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    "INSERT INTO users (name, phone, license_no, email) VALUES (?, ?, ?, ?)",
    [name, phone, license_no, email],
    async function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          res
            .status(400)
            .json({ error: "Phone, license number, or email already exists" });
          return;
        }
        res.status(500).json({ error: err.message });
        return;
      }

      // Send confirmation email
      try {
        await sendEmail(
          email,
          "Welcome to Car Rental Service",
          `Dear ${name},\n\nThank you for registering with our Car Rental Service. Your account has been successfully created.\n\nBest regards,\nCar Rental Service Team`
        );
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
      }

      res.json({ id: this.lastID, message: "User registered successfully. A confirmation email has been sent." });
    }
  );
});

// Get user by phone
app.get("/api/users/:phone", (req, res) => {
  db.get(
    "SELECT * FROM users WHERE phone = ?",
    [req.params.phone],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(row);
    }
  );
});

// RENTAL ENDPOINTS

// Create new rental
app.post("/api/rentals", async (req, res) => {
  const { car_id, user_id, start_date, end_date } = req.body;

  try {
    // Validate dates
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end <= start) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    // Check car availability
    const car = await getCar(car_id);
    if (!car.available) {
      return res.status(400).json({ error: "Car is not available" });
    }

    // Calculate total amount
    const total_amount = calculateRentalFee(
      start_date,
      end_date,
      car.rate_per_day
    );

    // Create rental and update car availability
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.run(
        `INSERT INTO rentals (car_id, user_id, start_date, end_date, total_amount)
         VALUES (?, ?, ?, ?, ?)`,
        [car_id, user_id, start_date, end_date, total_amount],
        function (err) {
          if (err) {
            db.run("ROLLBACK");
            res.status(500).json({ error: err.message });
            return;
          }

          db.run(
            "UPDATE cars SET available = 0 WHERE id = ?",
            [car_id],
            (err) => {
              if (err) {
                db.run("ROLLBACK");
                res.status(500).json({ error: err.message });
                return;
              }

              db.run("COMMIT");
              res.json({
                id: this.lastID,
                total_amount,
              });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all active rentals with car and user details
app.get("/api/rentals/active", (req, res) => {
  db.all(
    `SELECT r.*, 
            c.name as car_name, c.type as car_type, c.rate_per_day,
            u.name as user_name, u.phone as user_phone
     FROM rentals r
     JOIN cars c ON r.car_id = c.id
     JOIN users u ON r.user_id = u.id
     WHERE r.active = 1 AND r.end_date > datetime('now')
     ORDER BY r.start_date DESC`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Get all rentals history with car and user details
app.get("/api/rentals/history", (req, res) => {
  db.all(
    `SELECT r.*, 
            c.name as car_name, c.type as car_type, c.rate_per_day,
            u.name as user_name, u.phone as user_phone,
            CASE WHEN rv.id IS NOT NULL THEN 1 ELSE 0 END as has_review
     FROM rentals r
     JOIN cars c ON r.car_id = c.id
     JOIN users u ON r.user_id = u.id
     LEFT JOIN reviews rv ON r.id = rv.rental_id
     ORDER BY r.start_date DESC`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Get user's rentals
app.get("/api/rentals/user/:userId", (req, res) => {
  db.all(
    `SELECT r.*, c.name as car_name, c.type as car_type
     FROM rentals r
     JOIN cars c ON r.car_id = c.id
     WHERE r.user_id = ?
     ORDER BY r.start_date DESC`,
    [req.params.userId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// REVIEW ENDPOINTS

// Add review for a rental
app.post("/api/reviews", async (req, res) => {
  const { rental_id, rating, comment } = req.body;
  if (!rental_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid review data" });
  }

  db.run(
    "INSERT INTO reviews (rental_id, rating, comment) VALUES (?, ?, ?)",
    [rental_id, rating, comment],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

// Get next available date for a car
app.get("/api/cars/:id/next-available", (req, res) => {
  const carId = req.params.id;

  // First check if car exists and its current availability
  db.get("SELECT * FROM cars WHERE id = ?", [carId], (err, car) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!car) {
      res.status(404).json({ error: "Car not found" });
      return;
    }

    // If car is available, return immediately
    if (car.available) {
      res.json({ available: true, message: "Car is currently available" });
      return;
    }

    // If car is not available, find the latest active rental that hasn't ended yet
    db.get(
      `SELECT end_date 
       FROM rentals 
       WHERE car_id = ? AND active = 1 AND end_date > datetime('now')
       ORDER BY end_date DESC 
       LIMIT 1`,
      [carId],
      (err, rental) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        // If no future rentals found or rental has ended, update car availability
        if (!rental) {
          db.run(
            "UPDATE cars SET available = 1 WHERE id = ?",
            [carId],
            (err) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              res.json({
                available: true,
                message: "Car is currently available",
              });
            }
          );
          return;
        }

        // Car is still rented
        res.json({
          available: false,
          next_available_date: rental.end_date,
          message: `Car will be available after ${rental.end_date}`,
        });
      }
    );
  });
});

// Get all reviews
app.get("/api/reviews", (req, res) => {
  db.all(
    `SELECT r.*, 
            c.name as car_name, c.type as car_type,
            u.name as user_name
     FROM reviews r
     JOIN rentals rt ON r.rental_id = rt.id
     JOIN cars c ON rt.car_id = c.id
     JOIN users u ON rt.user_id = u.id
     ORDER BY r.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Get reviews for a car
app.get("/api/reviews/car/:carId", (req, res) => {
  db.all(
    `SELECT r.*, u.name as user_name
     FROM reviews r
     JOIN rentals rt ON r.rental_id = rt.id
     JOIN users u ON rt.user_id = u.id
     WHERE rt.car_id = ?
     ORDER BY r.created_at DESC`,
    [req.params.carId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
