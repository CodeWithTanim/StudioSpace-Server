# StudioSpace — Server API 🚀

Production-grade Express.js & MongoDB backend for **StudioSpace**, the peer-to-peer creative workspace and production studio sharing platform.

## 🛠️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas (Native MongoDB Driver)
- **Authentication**: JWT (JSON Web Tokens) with secure HTTPOnly Cookies
- **Cross-Origin**: CORS with credentials support
- **Environment**: dotenv

## 🔑 Key Features
- **JWT HTTPOnly Security (Challenge 1)**: Protected mutations (`POST /api/studios`, `DELETE /api/studios/:id`, `POST /api/bookings`) via HTTPOnly cookie authorization.
- **Double-Booking Collision Prevention (Challenge 2)**: Overlap detection logic prevents scheduling conflicts for confirmed reservations.
- **Full Studio CRUD**: Query filtering (categories, search, sorting, limit).
- **Booking Management**: Lifecycle tracking (`Pending`, `Confirmed`, `Completed`, `Cancelled`).
- **Wishlist Bookmarks**: Saved studio spaces in MongoDB.

## 📡 API Endpoints
- `GET /` — API health status
- `POST /api/seed` — Seed or reset creative studios
- `GET /api/studios` — Explore studios with query params (`category`, `search`, `sort`, `limit`, `featured`)
- `GET /api/studios/:id` — Single studio details
- `POST /api/studios` — Add new studio (Protected by `verifyJWT`)
- `PATCH /api/studios/:id` — Update studio (Protected by `verifyJWT`)
- `DELETE /api/studios/:id` — Delete studio (Protected by `verifyJWT`)
- `GET /api/my-studios/:email` — Retrieve user-owned studios
- `POST /api/bookings` — Create booking with conflict check (Protected by `verifyJWT`)
- `GET /api/my-bookings/:email` — Retrieve user bookings
- `PATCH /api/bookings/:id/cancel` — Cancel pending booking (Protected by `verifyJWT`)
- `PATCH /api/bookings/:id/status` — Update booking status (Protected by `verifyJWT`)
- `GET /api/bookings/:id` — Single booking for invoice receipt
- `GET /api/wishlist/:email` — User's saved studios
- `POST /api/wishlist/toggle` — Toggle wishlist studio (Protected by `verifyJWT`)
- `POST /api/jwt` — Issue JWT in HTTPOnly cookie
- `POST /api/logout` — Clear JWT HTTPOnly cookie

## 💻 Local Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Configure `.env` with `MONGODB_URI`, `PORT`, `JWT_SECRET`, `CLIENT_URL`
4. Run server: `node index.js`

