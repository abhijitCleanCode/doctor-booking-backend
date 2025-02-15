import mongoose, { Schema } from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "admin",
    },
    address: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    disable: {
      type: Boolean,
      default: false,
    },
    otpExpiresAt: {
      type: Date,
    },
    otp: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export const Admin = mongoose.model("Admin", adminSchema);
