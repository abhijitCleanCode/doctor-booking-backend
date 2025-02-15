import mongoose, { Schema } from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    appointmentDate: {
      type: String,
      required: true,
    },
    appointmentDay: {
      type: String,
      required: true,
    },
    appointmentTimeFrom: {
      type: String,
      required: true,
    },
    appointmentTimeTo: {
      type: String,
      required: true,
    },
    healthInsured: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: String,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },
    billingAddress: {
      type: String,
    },
    bookingCommission: {
      type: Number,
      default: 0,
    },
    doctorName: {
      type: String,
    },
    doctorFee: {
      type: Number,
    },
    clinicName: {
      type: String,
    },
    clinicNumber: {
      type: String,
    },
    clinicAddress: {
      type: String,
    },
    specialization: {
      type: String,
    },
    paymentStatus: {
      type: String,
      required: true,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
