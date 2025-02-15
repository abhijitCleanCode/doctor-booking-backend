import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const otpSchema = new Schema(
  {
    email: {
      type: String,
      lowercase: true,
      unique: [true, "Email already exists"],
      required: [true, "Email is required in otp schema"],
    },
    otp: {
      type: String,
      required: [true, "Otp is required in otp schema"],
    },
    expiresAt: {
      type: Date,
      required: [true, "Otp expiration date is required"],
    },
  },
  { timestamps: true }
);

// hash the otp before saving
otpSchema.pre("save", async function (next) {
  if (!this.isModified("otp")) return next;

  const hashedOtp = await bcrypt.hash(this.otp, 10);
  this.otp = hashedOtp;

  next();
});

otpSchema.methods.compareOtp = async function (candidateOtp) {
  return await bcrypt.compare(candidateOtp, this.otp);
};

export const OTP = mongoose.model("OTP", otpSchema);
