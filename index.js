require('dotenv').config();
const express = require('express');
const connectDB = require('./Config/db');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({ origin: "*" }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;