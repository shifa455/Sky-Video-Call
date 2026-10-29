Sky Video Call

A full-stack video calling application built with **React**, **Socket.IO**, **Node.js**, and **MongoDB**.
Supports video, audio, screen sharing, and chat in real-time.



 Live Links

- Frontend: [https://sky-video-call-frontend.onrender.com](https://sky-video-call-frontend.onrender.com)  
- Backend: [https://sky-video-call-backend.onrender.com](https://sky-video-call-backend.onrender.com)



 Project Structure

Frontend (React)

- `src/components/VideoMeet.js` → Main video call component  
- `src/App.js` → React routing  
- `package.json` → Dependencies  

 Backend (Node.js + Express + Socket.IO)

- `src/app.js` → Server entry point  
- `src/Controllers/socketManager.js` → Handles Socket.IO events  
- `src/Routes/user.routes.js` → API routes for user login/register  
- `src/Models/User.js` → Mongoose schema for users  
- `package.json` → Dependencies  



 Features

- Real-time **video** and **audio** calls  
- **Screen sharing** support  
- **Chat messages** during call  
- Multi-browser support: Chrome, Edge, Firefox  
- MongoDB integration for storing users and meetings  



Setup (Local Development)

 Backend

1. Clone the repository:


git clone https://github.com/shifa455/Sky-Video-Call.git
cd Sky-Video-Call/backend


Install dependencies:
npm install

Start backend server:
node src/app.js

Go to frontend folder:
cd ../frontend

Install dependencies:
npm install

Start frontend server:
npm start

Deployment
Frontend deployed on Render: https://sky-video-call-frontend.onrender.com

Backend deployed on Render: https://sky-video-call-backend.onrender.com

API Endpoints:
| Method | Route                  | Description         |
| ------ | ---------------------- | ------------------- |
| POST   | /api/v1/users/register | Register new user   |
| POST   | /api/v1/users/login    | Login user          |
| GET    | /health                | Server health check |


Usage:
Open frontend link in browser

Enter your username to join or create a call

Allow camera and microphone access

Start video/audio call and chat

Notes:
Make sure your MongoDB user has proper access and the connection string includes the database name.

Special characters in password must be URL encoded.

Tech Stack:
Frontend: React, Material-UI, Socket.IO-client

Backend: Node.js, Express, Socket.IO, Mongoose

Database: MongoDB Atlas

Hosting: Render












