require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');


const userRoutes = require('./routes/userRoutes');
const spaceRoutes = require('./routes/spaceRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const setupSwagger = require('./config/swagger');


const app = express();
connectDB();
app.use(express.json());
setupSwagger(app);

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', spaceRoutes);
app.use('/api', bookingRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));