import mongoose from "mongoose";
import { Doctor } from "../models/doctor.model.js";
import { Specialization } from "../models/specialization.model.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";

export const GET_ALL_DOCTORS = asyncHandler(async (request, response) => {
  const doctors = await Doctor.find();
  return response.status(200).json(new ApiResponse(200, doctors));
});

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

export const ADD_SPECIALIZATION = asyncHandler(async (request, response) => {
  const { specialization } = request.body;

  const newSpecialization = await Specialization.create({
    name: specialization,
  });

  const createdSpecialization = await Specialization.findById(
    newSpecialization._id
  );
  if (!createdSpecialization) {
    throw new ApiError(500, "Uh oh! specialization is not created");
  }
  return response
    .status(201)
    .json(
      new ApiResponse(
        201,
        createdSpecialization,
        "Specialization added successfully"
      )
    );
});

export const GET_ALL_SPECIALIZATION = asyncHandler(
  async (request, response) => {
    const specializations = await Specialization.find();
    return response.status(200).json(new ApiResponse(200, specializations));
  }
);
