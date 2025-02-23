import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const clinicSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  { timestamps: true }
);

export const Clinic = mongoose.model("Clinic", clinicSchema);
