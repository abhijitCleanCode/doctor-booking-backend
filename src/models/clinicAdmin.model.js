import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const clinicAdminSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Admin full name is required in clinic admin schema"],
    },
    email: {
      type: String,
      required: [true, "Email is required in clinic admin schema"],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    role: {
      type: String,
      default: "clinic",
    },
    phoneNumber: {
      type: String,
      required: [
        true,
        "Phone number is required while registering a clinic admin",
      ],
      match: [/^\+[1-9]\d{0,3}\d{10}$/, "Invalid phone number format"],
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// not working
clinicAdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

clinicAdminSchema.methods.comparePassword = async function (candidatePassword) {
  console.log("candidate password :: ", candidatePassword);
  return await bcrypt.compare(candidatePassword, this.password);
};

clinicAdminSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

clinicAdminSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const ClinicAdmin = mongoose.model("ClinicAdmin", clinicAdminSchema);
