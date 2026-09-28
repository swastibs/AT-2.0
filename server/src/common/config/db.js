import mongoose from "mongoose";
import { MONGODB_URI } from "./envConfig.js";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: "at" });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
