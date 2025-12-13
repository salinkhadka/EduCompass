require('dotenv').config();
const express = require('express');
const connectDB = require('./Config/db');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./Route/userRoutes');
const universityRoutes = require('./Route/univeristyRoute');
const scholarshipRoutes = require('./Route/scholarshipRoutes');
const courseRoutes = require('./Route/courseRoutes'); 

const app = express();
app.use(cors({ origin: "*" }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
connectDB();

app.use('/api/users', userRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/courses', courseRoutes);




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;