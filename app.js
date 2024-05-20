const express = require('express');
require('./config/db');
const bodyParser = require('body-parser');
const cors = require('cors');
const bookRoutes = require('./routes/bookRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use(morgan('dev'));
app.use(morgan('combined', { stream: accessLogStream }));
app.use(bodyParser.json());
app.use(cors());
app.use('/api/books', bookRoutes);
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const gracefulShutdown = () => {
  mongoose.connection.close(false, () => {
    console.log('MongoDB connection closed.');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = { app, server };
