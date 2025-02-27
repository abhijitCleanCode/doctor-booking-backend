import mongoose, { Schema } from "mongoose";

const clinicSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Clinic name is required while registering a clinic"],
    },
    email: {
      type: String,
      required: [true, "Email is required while registering a clinic"],
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
      required: [true, "City is required while registering a clinic"],
      index: true,
    },
    state: {
      type: String,
      required: [true, "State is required while registering a clinic"],
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required while registering a clinic"],
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  { timestamps: true, toJSON: { virtuals: true } } // Include virtuals in JSON output
);

clinicSchema.virtual("fullAddress").get(function () {
  return `${this.addressOne}, ${this.addressTwo}, ${this.city}, ${this.state}, ${this.pincode}`;
});

export const Clinic = mongoose.model("Clinic", clinicSchema);
