import mongoose from "mongoose";
import { Doctor } from "../models/doctor.model.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";

export const GET_DOCTOR_BY_CITY = asyncHandler(async (request, response) => {
  const { city } = request.params;

  if (!city) {
    throw new ApiError(400, "City is required");
  }

  const doctors = await Doctor.find({ city });

  if (!doctors) {
    throw new ApiError(404, "No doctors found for this city");
  }
  return response.status(200).json(new ApiResponse(200, doctors));
});

export const GET_DOCTOR_BY_SPECIALIZATION = asyncHandler(
  async (request, response) => {
    const { specialization } = request.params;

    if (!specialization) {
      throw new ApiError(400, "Specialization is required");
    }

    const doctors = await Doctor.find({ specialization });

    if (!doctors) {
      throw new ApiError(404, "No doctors found for this specialization");
    }
    return response.status(200).json(new ApiResponse(200, doctors));
  }
);
