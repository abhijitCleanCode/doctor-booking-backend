import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const clinicSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Clinic name is required while registering a clinic"],
    },
    email: {
      type: String,
      required: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
      unique: [true, "Email is already in used by some other clinic"],
      index: true,
    },
    phoneNumber: {
      type: String,
    },
    addressOne: {
      type: String,
    },
    addressTwo: {
      type: String,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  { timestamps: true, toJSON: { virtuals: true } } // Include virtuals in JSON output }
);

clinicSchema.virtual("fullAddress").get(function () {
  return `${this.addressOne}, ${this.addressTwo}, ${this.city}, ${this.state}, ${this.pincode}`;
});

export const Clinic = mongoose.model("Clinic", clinicSchema);
