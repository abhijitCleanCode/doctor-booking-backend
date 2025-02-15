import mongoose, { Schema } from "mongoose";

const adminCommissionSchema = new mongoose.Schema(
  {
    platFormFee: {
      type: Number,
      default: 1,
      required: true,
    },
    bookingCommission: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  { timestamps: true }
);

export const AdminCommission = mongoose.model(
  "AdminCommission",
  adminCommissionSchema
);
