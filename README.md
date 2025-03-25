# Car Rental System

A simple car rental system built with React and Node.js.

## Features

- View available cars
- User registration
- Car rental booking
- Review system
- Simple and intuitive interface

## Setup

1. Install dependencies for both client and server:

```bash
# Install client dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

2. Initialize the database with sample data:

```bash
npm run seed
```

3. Start the development server:

```bash
npm run dev:all
```

This will start both the frontend (on port 5173) and backend (on port 5000) servers.

## Database Schema

The system uses SQLite with the following tables:

- cars: Stores car information (id, name, type, rate_per_day, available)
- users: Stores user information (id, name, phone, license_no)
- rentals: Tracks car rentals (id, car_id, user_id, start_date, end_date, total_amount, active)
- reviews: Stores user reviews (id, rental_id, rating, comment, created_at)

  ER Diagram
![image](https://github.com/user-attachments/assets/f152a3a7-aeac-4f96-99e4-6a8844bc09e1)


## API Endpoints

- GET /api/cars - List all cars
- GET /api/cars/available - List available cars
- POST /api/users - Register new user
- GET /api/users/:phone - Get user by phone
- POST /api/rentals - Create new rental
- GET /api/rentals/user/:userId - Get user's rentals
- POST /api/reviews - Add review
- GET /api/reviews/car/:carId - Get car reviews

## Technologies Used

- Frontend: React, Vite
- Backend: Node.js, Express
- Database: SQLite3
