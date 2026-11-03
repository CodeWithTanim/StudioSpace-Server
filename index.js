import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.send({ message: 'StudioSpace Server is running smoothly!' });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
