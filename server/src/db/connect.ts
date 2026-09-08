import mongoose from "mongoose";
import { serverEnv } from "../config/serverEnv";

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(serverEnv.MONGODB_URI);
  console.log("[db] connected to MongoDB");
}
