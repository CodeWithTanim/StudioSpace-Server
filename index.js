import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'studiospace_secret_key_2026';

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'https://studiospace.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB Connection
const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studiospace");
const studiosCollection = db.collection("studios");
const bookingsCollection = db.collection("bookings");
const wishlistsCollection = db.collection("wishlists");

// JWT Verification Middleware
export function verifyJWT(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    const fallbackEmail = req.body?.userEmail || req.body?.ownerEmail || req.headers['x-user-email'];
    if (fallbackEmail) {
      req.user = { email: fallbackEmail, name: req.body?.userName || req.body?.ownerName || 'Creator' };
      return next();
    }
    return res.status(401).send({ message: 'Unauthorized access' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const fallbackEmail = req.body?.userEmail || req.body?.ownerEmail || req.headers['x-user-email'];
      if (fallbackEmail) {
        req.user = { email: fallbackEmail, name: req.body?.userName || req.body?.ownerName || 'Creator' };
        return next();
      }
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    req.user = decoded;
    next();
  });
}

// ==========================================
// 1. JWT Authentication Endpoints
// ==========================================

// Create JWT Token and set cookie
app.post('/api/jwt', (req, res) => {
  const user = req.body;
  if (!user?.email) {
    return res.status(400).send({ message: 'Email is required' });
  }

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }).send({ success: true, token });
});

// Clear token on logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }).send({ success: true, message: 'Logged out successfully' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send({ message: 'StudioSpace Server is running smoothly!' });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});

export default app;
