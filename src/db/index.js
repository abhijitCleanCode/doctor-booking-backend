import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
  try {
    // open mongoose connection to mongodb
    const DB_Connect_Instance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );

    // Check if app is connected to proper DB server
    console.log(
        "MongoDB connected !! DB Host :: ",
        DB_Connect_Instance.connection.host
      );
  } catch (error) {
    console.log("MongoDB connection Failed !! ", error);
    process.exit(1);
  }
};

export default connectDB;
