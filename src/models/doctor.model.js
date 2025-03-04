import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import { Clinic } from "./clinic.model.js";

const doctorSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      // required: true,
    },
    role: {
      type: String,
      default: "doctor",
    },
    specialization: {
      type: String,
      required: true,
    },
    qualification: {
      type: String,
    },
    registrationNumber: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
    },
    addressLine2: {
      type: String,
    },
    clinics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Clinic",
      },
    ],
    gender: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    experience: {
      type: String,
    },
    available: {
      type: Boolean,
      default: true,
    },
    disable: {
      type: Boolean,
      default: false,
    },
    fees: [
      {
        clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic" },
        fee: { type: Number },
      },
    ],
    appointmentsSchedule: [
      {
        clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic" },
        schedule: [
          {
            day: { type: String },
            startTime: { type: String },
            endTime: { type: String },
            maxSlots: { type: Number, default: 0 },
          },
        ],
      },
    ],
    termsAccepted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Doctor = mongoose.model("Doctor", doctorSchema);
