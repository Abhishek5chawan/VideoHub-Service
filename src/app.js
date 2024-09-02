import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser"; //cors and cookie parser are configured after app is created

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"})) // Set the maximum allowed request body size to 16KB from body, to prevent the server from crashing if a malicious user sends a huge request.
app.use(express.urlencoded({extended: true, limit: "16kb"})) // Set the maximum allowed request body size to 16KB from the url, to prevent the server 
app.use(express.static("public")) // Serve static files from the public folder which are not confidential
app.use(cookieParser())

export { app }