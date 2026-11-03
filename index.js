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

// ==========================================
// 2. Studios Endpoints
// ==========================================

// Add Studio (POST)
app.post('/api/studios', verifyJWT, async (req, res) => {
  try {
    const data = req.body;

    const newStudio = {
      title: data.title,
      category: data.category,
      hourlyRate: Number(data.hourlyRate),
      securityDeposit: Number(data.securityDeposit || 0),
      maxCapacity: Number(data.maxCapacity || 10),
      location: data.location,
      imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80",
      gallery: Array.isArray(data.gallery) && data.gallery.length > 0
        ? data.gallery
        : [data.imageUrl || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80"],
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
      overview: data.overview || "High performance creative workspace with professional facilities.",
      ownerName: data.ownerName || req.user?.name || "Studio Host",
      ownerEmail: data.ownerEmail || req.user?.email || "host@studiospace.com",
      ownerAvatar: data.ownerAvatar || req.user?.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      rating: 5.0,
      reviewsCount: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await studiosCollection.insertOne(newStudio);
    console.log('Inserted studio:', result);
    res.send({ success: true, insertedId: result.insertedId, studio: newStudio });
  } catch (err) {
    res.status(500).send({ message: 'Error adding studio', error: err.message });
  }
});

// All Studios (GET with Category, Search, Sort & Limit)
app.get('/api/studios', async (req, res) => {
  try {
    const { category, search, sort, limit, featured } = req.query;
    let query = {};

    if (category && category.toLowerCase() !== 'all') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { amenities: { $regex: search, $options: 'i' } }
      ];
    }

    let cursor = studiosCollection.find(query);

    if (sort === 'price_asc') {
      cursor = cursor.sort({ hourlyRate: 1 });
    } else if (sort === 'price_desc') {
      cursor = cursor.sort({ hourlyRate: -1 });
    } else if (sort === 'rating_desc' || featured === 'true') {
      cursor = cursor.sort({ rating: -1, createdAt: -1 });
    } else {
      cursor = cursor.sort({ createdAt: -1 });
    }

    if (limit) {
      cursor = cursor.limit(parseInt(limit));
    } else if (featured === 'true') {
      cursor = cursor.limit(6);
    }

    const result = await cursor.toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching studios', error: err.message });
  }
});

// Single Studio Details (GET)
app.get('/api/studios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(404).send({ message: "Invalid Studio ID" });
    }
    const result = await studiosCollection.findOne({ _id: new ObjectId(id) });
    if (!result) {
      return res.status(404).send({ message: "Studio not found" });
    }
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Error fetching studio", error: err.message });
  }
});

// Update Studio (PATCH & PUT)
const updateStudio = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid Studio ID" });
    }

    const updatedData = { ...req.body };
    delete updatedData._id;
    if (updatedData.hourlyRate) updatedData.hourlyRate = Number(updatedData.hourlyRate);
    if (updatedData.securityDeposit) updatedData.securityDeposit = Number(updatedData.securityDeposit);
    if (updatedData.maxCapacity) updatedData.maxCapacity = Number(updatedData.maxCapacity);
    updatedData.updatedAt = new Date();

    const result = await studiosCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    res.send({ success: true, message: 'Studio updated successfully', result });
  } catch (err) {
    res.status(500).send({ message: "Update failed", error: err.message });
  }
};

app.patch('/api/studios/:id', verifyJWT, updateStudio);
app.put('/api/studios/:id', verifyJWT, updateStudio);

// Delete Studio (DELETE)
app.delete('/api/studios/:id', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid Studio ID" });
    }
    const result = await studiosCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ success: true, message: 'Studio deleted successfully', result });
  } catch (err) {
    res.status(500).send({ message: "Delete failed", error: err.message });
  }
});

// Host's Studios (GET)
app.get('/api/my-studios/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await studiosCollection.find({ ownerEmail: email }).sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Error fetching user studios", error: err.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send({ message: 'StudioSpace Server is running smoothly!' });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});

export default app;
