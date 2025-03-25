import React, { useState, useEffect } from "react";
import "./App.css";

// NextAvailableDate component to show when a car will be available
const NextAvailableDate = ({ carId }) => {
  const [nextAvailable, setNextAvailable] = useState(null);
  const backendUrl = "http://localhost:5000";

  useEffect(() => {
    const fetchNextAvailable = async () => {
      try {
        const res = await fetch(
          `${backendUrl}/api/cars/${carId}/next-available`
        );
        const data = await res.json();
        setNextAvailable(data);
      } catch (err) {
        console.error("Error fetching next available date:", err);
      }
    };
    fetchNextAvailable();
  }, [carId]);

  if (!nextAvailable) return <div className="loader"></div>;

  return (
    <div className="not-available">
      <button className="button secondary" disabled>
        Not Available
      </button>
      <p className="availability-info">
        {nextAvailable.available
          ? "Car is currently available"
          : `Available after ${new Date(
              nextAvailable.next_available_date
            ).toLocaleDateString()}`}
      </p>
    </div>
  );
};

// Dashboard component to show active rentals
const Dashboard = () => {
  const [activeRentals, setActiveRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const backendUrl = "http://localhost:5000";

  useEffect(() => {
    const fetchActiveRentals = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/rentals/active`);
        const data = await res.json();
        setActiveRentals(data);
      } catch (err) {
        console.error("Error fetching active rentals:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveRentals();
  }, []);

  if (loading) return <div className="loader"></div>;

  return (
    <div className="dashboard">
      <h2>Currently Rented Cars</h2>
      <div className="rental-table">
        <table>
          <thead>
            <tr>
              <th>Car</th>
              <th>Type</th>
              <th>Rented By</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {activeRentals.map((rental) => (
              <tr key={rental.id}>
                <td>{rental.car_name}</td>
                <td>{rental.car_type}</td>
                <td>{rental.user_name}</td>
                <td>{new Date(rental.start_date).toLocaleDateString()}</td>
                <td>{new Date(rental.end_date).toLocaleDateString()}</td>
                <td>${rental.total_amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Reviews component to show all reviews
const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const backendUrl = "http://localhost:5000";

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/reviews`);
        const data = await res.json();
        setReviews(data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  if (loading) return <div className="loader"></div>;

  return (
    <div className="reviews">
      <h2>Car Reviews</h2>
      <div className="reviews-grid">
        {reviews.map((review) => (
          <div key={review.id} className="review-card">
            <div className="review-header">
              <h3>{review.car_name}</h3>
              <div className="rating">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </div>
            </div>
            <p className="review-comment">{review.comment}</p>
            <p className="review-meta">
              By {review.user_name} on{" "}
              {new Date(review.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// RentalLogs component to show rental history
const RentalLogs = ({ setSelectedRental, setReviewForm }) => {
  const [rentalHistory, setRentalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const backendUrl = "http://localhost:5000";

  useEffect(() => {
    const fetchRentalHistory = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/rentals/history`);
        const data = await res.json();
        setRentalHistory(data);
      } catch (err) {
        console.error("Error fetching rental history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRentalHistory();
  }, []);

  if (loading) return <div className="loader"></div>;

  return (
    <div className="rental-logs">
      <h2>Rental History</h2>
      <div className="rental-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Car</th>
              <th>Type</th>
              <th>Rented By</th>
              <th>Duration</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rentalHistory.map((rental) => {
              const now = new Date();
              const endDate = new Date(rental.end_date);
              const canReview = endDate < now && !rental.has_review;

              return (
                <tr key={rental.id}>
                  <td>{new Date(rental.start_date).toLocaleDateString()}</td>
                  <td>{rental.car_name}</td>
                  <td>{rental.car_type}</td>
                  <td>{rental.user_name}</td>
                  <td>
                    {Math.ceil(
                      (new Date(rental.end_date) -
                        new Date(rental.start_date)) /
                        (1000 * 60 * 60 * 24)
                    )}{" "}
                    days
                  </td>
                  <td>${rental.total_amount}</td>
                  <td>
                    {canReview && (
                      <button
                        className="button primary small"
                        onClick={() => {
                          setSelectedRental(rental);
                          setReviewForm({
                            rental_id: rental.id,
                            rating: 5,
                            comment: "",
                          });
                        }}
                      >
                        Add Review
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function App() {
  const [page, setPage] = useState("cars");
  const [cars, setCars] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedRental, setSelectedRental] = useState(null);
  const [loading, setLoading] = useState(false);
  const backendUrl = "http://localhost:5000";

  // User registration state
  const [userForm, setUserForm] = useState({
    name: "",
    phone: "",
    license_no: "",
  });

  // Rental form state
  const [rentalForm, setRentalForm] = useState({
    start_date: "",
    end_date: "",
  });

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    rental_id: null,
    rating: 5,
    comment: "",
  });

  // Handle review submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage("Review submitted successfully!");
        setSelectedRental(null);
        setReviewForm({ rental_id: null, rating: 5, comment: "" });
      }
    } catch (err) {
      setMessage("Error submitting review");
    }
  };

  // Fetch all cars
  const fetchCars = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/cars`);
      const data = await res.json();
      setCars(data);
    } catch (err) {
      setMessage("Error fetching cars");
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  // Handle user registration
  const handleUserRegistration = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage("User registered successfully!");
        setUserForm({ name: "", phone: "", license_no: "" });
      }
    } catch (err) {
      setMessage("Error registering user");
    }
  };

  // Handle rental creation
  const handleRental = async (e) => {
    e.preventDefault();
    if (!selectedCar) return;

    try {
      // First get user by phone
      const userRes = await fetch(`${backendUrl}/api/users/${userForm.phone}`);
      const userData = await userRes.json();

      if (userData.error) {
        setMessage("User not found. Please register first.");
        return;
      }

      const rentalData = {
        car_id: selectedCar.id,
        user_id: userData.id,
        start_date: rentalForm.start_date,
        end_date: rentalForm.end_date,
      };

      const res = await fetch(`${backendUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rentalData),
      });

      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage(`Rental created! Total amount: $${data.total_amount}`);
        setRentalForm({ start_date: "", end_date: "" });
        setSelectedCar(null);
        fetchCars(); // Refresh car list
      }
    } catch (err) {
      setMessage("Error creating rental");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Car Rental System</h1>
        <nav className="nav">
          <button
            className={`nav-btn ${page === "cars" ? "active" : ""}`}
            onClick={() => setPage("cars")}
          >
            Available Cars
          </button>
          <button
            className={`nav-btn ${page === "dashboard" ? "active" : ""}`}
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${page === "logs" ? "active" : ""}`}
            onClick={() => setPage("logs")}
          >
            Rental Logs
          </button>
          <button
            className={`nav-btn ${page === "reviews" ? "active" : ""}`}
            onClick={() => setPage("reviews")}
          >
            Reviews
          </button>
          <button
            className={`nav-btn ${page === "register" ? "active" : ""}`}
            onClick={() => setPage("register")}
          >
            Register
          </button>
        </nav>
      </header>

      <main className="main">
        {message && (
          <div
            className={`message ${
              message.includes("Error") ? "error" : "success"
            }`}
          >
            {message}
          </div>
        )}

        {page === "cars" && (
          <div className="content">
            <div className="content-header">
              <h2>Available Cars</h2>
              <button
                className="refresh-btn"
                onClick={() => {
                  setLoading(true);
                  fetchCars().finally(() => setLoading(false));
                }}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            {loading ? (
              <div className="loader"></div>
            ) : (
              <div className="car-grid">
                {cars.map((car) => (
                  <div key={car.id} className="car-card">
                    <h3>{car.name}</h3>
                    <p>Type: {car.type}</p>
                    <p>Rate: ${car.rate_per_day}/day</p>
                    {car.available ? (
                      <button
                        className="button primary"
                        onClick={() => setSelectedCar(car)}
                      >
                        Rent Now
                      </button>
                    ) : (
                      <NextAvailableDate carId={car.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedCar && (
              <div className="modal">
                <div className="modal-content">
                  <h3>Rent {selectedCar.name}</h3>
                  <form onSubmit={handleRental}>
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={userForm.phone}
                      onChange={(e) =>
                        setUserForm({ ...userForm, phone: e.target.value })
                      }
                      required
                    />
                    <input
                      type="date"
                      value={rentalForm.start_date}
                      onChange={(e) =>
                        setRentalForm({
                          ...rentalForm,
                          start_date: e.target.value,
                        })
                      }
                      required
                    />
                    <input
                      type="date"
                      value={rentalForm.end_date}
                      onChange={(e) =>
                        setRentalForm({
                          ...rentalForm,
                          end_date: e.target.value,
                        })
                      }
                      required
                    />
                    <div className="button-group">
                      <button type="submit" className="button primary">
                        Confirm Rental
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setSelectedCar(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {page === "dashboard" && <Dashboard />}
        {page === "logs" && (
          <RentalLogs
            setSelectedRental={setSelectedRental}
            setReviewForm={setReviewForm}
          />
        )}
        {page === "reviews" && <Reviews />}
        {selectedRental && (
          <div className="modal">
            <div className="modal-content">
              <h3>Review for {selectedRental.car_name}</h3>
              <form onSubmit={handleReviewSubmit}>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${
                        star <= reviewForm.rating ? "active" : ""
                      }`}
                      onClick={() =>
                        setReviewForm({ ...reviewForm, rating: star })
                      }
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Write your review..."
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  required
                />
                <div className="button-group">
                  <button type="submit" className="button primary">
                    Submit Review
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setSelectedRental(null);
                      setReviewForm({
                        rental_id: null,
                        rating: 5,
                        comment: "",
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {page === "register" && (
          <div className="content">
            <h2>User Registration</h2>
            <form onSubmit={handleUserRegistration} className="form">
              <input
                type="text"
                placeholder="Full Name"
                value={userForm.name}
                onChange={(e) =>
                  setUserForm({ ...userForm, name: e.target.value })
                }
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={userForm.phone}
                onChange={(e) =>
                  setUserForm({ ...userForm, phone: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="License Number"
                value={userForm.license_no}
                onChange={(e) =>
                  setUserForm({ ...userForm, license_no: e.target.value })
                }
                required
              />
              <button type="submit" className="button primary">
                Register
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
