# Vidtube Backend

Vidtube is a full-featured video-sharing platform backend built with Node.js, Express, and MongoDB. It supports user authentication, video upload and streaming, comments, likes, playlists, subscriptions, tweets, and more. The project is modular, scalable, and ready for production deployment.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Folder Overview](#folder-overview)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **User Authentication:** Register, login, JWT-based authentication, refresh tokens.
- **Video Management:** Upload, update, delete, and stream videos with Cloudinary integration.
- **Comments:** Add, update, delete, and fetch comments on videos.
- **Likes:** Like/unlike videos, comments, and tweets.
- **Playlists:** Create, update, delete playlists; add/remove videos.
- **Subscriptions:** Subscribe/unsubscribe to channels, view subscribers and subscriptions.
- **Tweets:** Post, update, delete, and fetch tweets (microblogging).
- **Dashboard:** (Extendable) For analytics and admin features.
- **Robust Validation:** Input validation and error handling throughout.
- **Secure:** Password hashing, JWT, and route protection.
- **Scalable:** Modular codebase, ready for further extension.

---

## Tech Stack

- **Node.js** & **Express.js** – Server and API
- **MongoDB** & **Mongoose** – Database and ODM
- **Cloudinary** – Video and image storage
- **JWT** – Authentication
- **bcrypt** – Password hashing
- **Multer** – File uploads
- **CORS** – Cross-origin resource sharing
- **ESLint** – Code linting

---

## Project Structure

```
src/
  controllers/      # All route logic (videos, users, comments, etc.)
  db/               # Database connection
  middlewares/      # Express middlewares (auth, error, multer, etc.)
  models/           # Mongoose schemas/models
  routes/           # Express route definitions
  utils/            # Utility functions (cloudinary, error, response, etc.)
  constants.js      # App-wide constants
  app.js            # Express app setup
  index.js          # Entry point
.gitignore
.env.example
readme.md
```

---

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/yourusername/vidtube.git
cd vidtube
```

### 2. Install dependencies

```sh
npm install
```

### 3. Set up environment variables

- Copy `.env.example` to `.env` and fill in your values:

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CORS_ORIGIN=http://localhost:3000
```

### 4. Run the server

```sh
npm start
```
or for development:
```sh
npm run dev
```

---

## Environment Variables

| Variable                  | Description                        |
|---------------------------|------------------------------------|
| PORT                      | Server port                        |
| MONGODB_URI               | MongoDB connection string          |
| JWT_SECRET                | JWT secret key                     |
| CLOUDINARY_CLOUD_NAME     | Cloudinary cloud name              |
| CLOUDINARY_API_KEY        | Cloudinary API key                 |
| CLOUDINARY_API_SECRET     | Cloudinary API secret              |
| CORS_ORIGIN               | Allowed frontend origin            |

---

## API Endpoints

### **Auth & User**
- `POST /api/v1/users/register` – Register a new user
- `POST /api/v1/users/login` – Login
- `POST /api/v1/users/refresh-token` – Refresh JWT
- `GET /api/v1/users/me` – Get current user profile
- `PATCH /api/v1/users/change-password` – Change password

### **Videos**
- `GET /api/v1/videos` – List videos (with query, sort, pagination)
- `POST /api/v1/videos/publish` – Publish a new video
- `GET /api/v1/videos/:videoId` – Get video by ID
- `PATCH /api/v1/videos/:videoId` – Update video
- `DELETE /api/v1/videos/:videoId` – Delete video
- `PATCH /api/v1/videos/:videoId/toggle-publish` – Toggle publish status

### **Comments**
- `GET /api/v1/comments/:videoId` – Get comments for a video
- `POST /api/v1/comments/:videoId` – Add comment
- `PATCH /api/v1/comments/:commentId` – Update comment
- `DELETE /api/v1/comments/:commentId` – Delete comment

### **Likes**
- `POST /api/v1/likes/video/:videoId` – Like/unlike a video
- `POST /api/v1/likes/comment/:commentId` – Like/unlike a comment
- `POST /api/v1/likes/tweet/:tweetId` – Like/unlike a tweet
- `GET /api/v1/likes/videos` – Get liked videos

### **Playlists**
- `POST /api/v1/playlists` – Create playlist
- `GET /api/v1/playlists/user/:userId` – Get user playlists
- `GET /api/v1/playlists/:playlistId` – Get playlist by ID
- `PATCH /api/v1/playlists/:playlistId` – Update playlist
- `DELETE /api/v1/playlists/:playlistId` – Delete playlist
- `POST /api/v1/playlists/:playlistId/video/:videoId` – Add video to playlist
- `DELETE /api/v1/playlists/:playlistId/video/:videoId` – Remove video from playlist

### **Subscriptions**
- `POST /api/v1/subscriptions/:channelId` – Subscribe/unsubscribe to channel
- `GET /api/v1/subscriptions/channel/:channelId` – Get channel subscribers
- `GET /api/v1/subscriptions/user/:subscriberId` – Get user subscriptions

### **Tweets**
- `POST /api/v1/tweets` – Create tweet
- `GET /api/v1/tweets/user/:userId` – Get user tweets
- `PATCH /api/v1/tweets/:tweetId` – Update tweet
- `DELETE /api/v1/tweets/:tweetId` – Delete tweet

---

## Folder Overview

- **controllers/** – All business logic for each resource.
- **models/** – Mongoose schemas for users, videos, comments, etc.
- **routes/** – Express routers for each resource.
- **middlewares/** – Authentication, error handling, file upload, etc.
- **utils/** – Helper functions (Cloudinary, error/response wrappers).
- **db/** – MongoDB connection logic.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the Users License.

---

**Happy Coding!**
