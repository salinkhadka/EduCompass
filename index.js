require('dotenv').config();
const express = require('express');
const connectDB = require('./Config/db');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('./Config/passport');

// Routes
const userRoutes = require('./Route/userRoutes');
const universityRoutes = require('./Route/univeristyRoute');
const scholarshipRoutes = require('./Route/scholarshipRoutes');
const courseRoutes = require('./Route/courseRoutes');
const analyticsRoutes = require('./Route/analyticsRoutes');
const adminRoutes = require('./Route/adminroutes'); // NEW
const recommendationRoutes = require('./Route/recommendationRoutes');

const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use(express.json());

// Session middleware
app.use(
  session({
    secret: process.env.JWT_SECRET || 'defaultsecret',
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Connect to database
connectDB();

// API routes
app.use('/api/users', userRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes); // NEW ADMIN ROUTES

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;