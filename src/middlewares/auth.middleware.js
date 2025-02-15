import { asyncHandler } from "../utils/asyncHandler.utils.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ClinicAdmin } from "../models/clinicAdmin.model.js";

// checks the user’s role and allows access
export function authorize(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role;

    // super admin has access to everything
    if (userRole === "superAdmin") {
      return next();
    }

    // Check if the user's role is allowed
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // Deny access if the role is not allowed
    return res.status(403).json({ message: "Access denied" });
  };
}

export const VERIFY_FOR_CLINIC = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Brearer ", "");

    console.log("auth middleware :: token : ", token);

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await ClinicAdmin.findById(decodeToken._id).select(
      "-password -refreshToken"
    );

    console.log("auth middleware :: user : ", user);

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;

    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

export const VERIFY_FOR_USER = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); // Fixing "Brearer" typo

    console.log("auth middleware :: token : ", token);

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    console.log("auth middleware :: user : ", user);

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;

    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
