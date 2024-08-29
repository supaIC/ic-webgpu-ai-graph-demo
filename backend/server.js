import express from "express";
import vectordbHandler from "./vectordbHandler.js";
import cors from "cors"; // Import CORS

const app = express();

// Configure CORS to allow requests from your frontend's origin
app.use(cors({
  origin: 'http://localhost:5173', // Allow only this origin
  methods: 'GET,POST', // Allowable methods
  credentials: true // Allow credentials (e.g., cookies, authorization headers)
}));

app.use(express.json());
app.use("/api", vectordbHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
