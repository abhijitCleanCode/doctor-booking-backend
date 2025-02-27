import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Clinic } from "../models/clinic.model.js";
import { ClinicAdmin } from "../models/clinicAdmin.model.js";
import { Doctor } from "../models/doctor.model.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { Appointment } from "../models/appointment.model.js";

const generateAccessToken_RefreshToken = async function (userId) {
  try {
    const user = await ClinicAdmin.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

// create clinic along with clinic admin
export const SIGNUPCLINIC = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phoneNumber,
    addressOne,
    city,
    state,
    pincode,
    userName,
    password,
    userAddress,
    userEmail,
    userPhoneNumber,
    latitude,
    longitude,
  } = req.body;

  // Validate required fields
  if (
    [
      name,
      email,
      phoneNumber,
      addressOne,
      city,
      state,
      pincode,
      userName,
      userEmail,
      password,
    ].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  // Validate latitude and longitude
  if ((latitude && isNaN(latitude)) || (longitude && isNaN(longitude))) {
    throw new ApiError(400, "Latitude and longitude must be numbers.");
  }

  // Start a MongoDB session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if clinic already exists
    const existingClinic = await Clinic.findOne({ email }).session(session);
    if (existingClinic) {
      throw new ApiError(409, "Clinic with this email already exists.");
    }

    // Check if clinic admin already exists
    const existingClinicUser = await ClinicAdmin.findOne({
      email: userEmail,
    }).session(session);
    if (existingClinicUser) {
      throw new ApiError(409, "Clinic admin already exists.");
    }

    const clinic = await Clinic.create(
      [
        {
          name,
          email,
          phoneNumber,
          addressOne,
          city,
          state,
          pincode,
          latitude,
          longitude,
        },
      ],
      { session }
    );
    const savedClinic = await Clinic.findById(clinic[0]._id).session(session);
    if (!savedClinic) {
      throw new ApiError(500, "Uh oh!, Clinic not registered");
    }

    const clinicAdmin = await ClinicAdmin.create(
      [
        {
          fullName: userName,
          email: userEmail,
          phoneNumber: userPhoneNumber,
          address: userAddress,
          password,
          clinicId: savedClinic._id,
        },
      ],
      { session }
    );
    const savedClinicUser = await ClinicAdmin.findById(clinicAdmin[0]._id)
      .select("-password")
      .session(session);
    if (!savedClinicUser) {
      throw new ApiError(500, "Uh oh!, Clinic admin not registered");
    }

    const { accessToken, refreshToken } = generateAccessToken_RefreshToken(
      savedClinicUser._id
    );

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { savedClinic, savedClinicUser, accessToken, refreshToken },
          "Clinic created successfully."
        )
      );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw new ApiError(
      error.code || 500,
      error.message || "Internal Server Error"
    );
  }
});

// clinic admin is logging in
export const LOGINCLINIC = asyncHandler(async (req, res) => {
  // request body -> data
  // extract data (obj destrucring)
  // find the user from DB
  // password check
  // generate access and refresh token

  const { email = "", password = "" } = req.body;

  if ([email, password].some((field) => field.trim() === ""))
    throw new ApiError(400, "All fields are required");

  const clinicAdmin = await ClinicAdmin.findOne({ email });
  if (!clinicAdmin) throw new ApiError(404, "Clinic admin does not exist.");

  // verify password. clinicAdmin -> db instance created via ClinicAdmin thus your define methods can be access using clinicAdmin
  const isPasswordValid = await clinicAdmin.comparePassword(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid user credentials");

  // generate access and refresh token
  const { accessToken, refreshToken } = await generateAccessToken_RefreshToken(
    clinicAdmin._id
  );

  // Don't send password to front-end
  const loggedInClinicAdmin = await ClinicAdmin.findById(clinicAdmin._id)
    .populate(
      "clinicId",
      "name email phoneNumber addressOne addressTwo city state pincode"
    )
    .select("-password");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInClinicAdmin, accessToken, refreshToken },
        "Clinic admin logged in successfully."
      )
    );
});

export const GETCLINICDETAILS = asyncHandler(async (req, res) => {
  const { clinicId } = req.user;

  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new ApiError(404, "Clinic not found");
  }

  const clinicUser = await ClinicAdmin.find({ clinicId }).select(
    "-password -refreshToken -clinicId"
  );
  if (!clinicUser) {
    throw new ApiError(404, "Clinic admin not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { clinicDetails: clinic, clinicUser },
        "Clinic fetched"
      )
    );
});

export const CREATE_CLINIC_ADMIN = asyncHandler(async (req, res) => {
  const {
    fullName = "",
    email = "",
    password = "",
    address = "",
    phoneNumber = "",
  } = req.body;

  if (
    [fullName, email, phoneNumber, address, password].some(
      (field) => field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existedClinicAdmin = await ClinicAdmin.findOne({ email }).session(
      session
    );

    if (existedClinicAdmin) {
      throw new ApiError(409, "Clinic admin already exists");
    }

    const clinicAdmin = await ClinicAdmin.create(
      [
        {
          fullName,
          email,
          password,
          address,
          phoneNumber,
          clinicId: req.user.clinicId,
        },
      ],
      { session }
    );

    const createdClinicAdmin = await ClinicAdmin.findById(clinicAdmin[0]._id)
      .select("-password")
      .session(session);
    if (!createdClinicAdmin) {
      throw new ApiError(500, "Clinic admin not registered");
    }

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user: createdClinicAdmin },
          "Clinic admin created successfully!"
        )
      );
  } catch {
    await session.abortTransaction();
    session.endSession();

    throw new ApiError(
      error.code || 500,
      error.message || "Something went wrong while creating clinic admin"
    );
  }
});

// fetch a paginated list of clinic admins associated with a specific clinic.
export const GETALLCLINICADMINS = asyncHandler(async (req, res) => {
  const { clinicId } = req.user;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit);
  const skip = (page - 1) * limit;

  const totalUsers = await ClinicAdmin.countDocuments({
    clinicId,
  });
  const totalPages = Math.ceil(totalUsers / limit);

  const clinicAdmins = await ClinicAdmin.find({
    clinicId,
  })
    .select("-password -refreshToken")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { users: clinicAdmins, totalPages: totalPages || 1, totalUsers },
        "Clinic admins fetched successfully."
      )
    );
});

// potential update use destructuring
export const GETCLINICADMINBYID = asyncHandler(async (req, res) => {
  const { clinicId } = req.user;
  const { userId } = req.params;

  const clinicAdmin = await ClinicAdmin.findById({
    _id: userId,
    clinicId,
  })
    .populate(
      "clinicId",
      "name email phoneNumber addressOne addressTwo city state pincode"
    )
    .select("-password -refreshToken");

  if (!clinicAdmin) {
    throw new ApiError(404, "Clinic admin not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user: clinicAdmin }, "Clinic admin fetched"));
});

export const GET_CLINIC_BY_CITIES = asyncHandler(async (req, res) => {
  const { city } = req.params;

  const clinics = await Clinic.find({
    city: { $regex: new RegExp(`^${city}$`, "i") },
  });

  if (!clinics) {
    throw new ApiError(404, "Clinic not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { clinics }, "Clinic fetched"));
});

export const UPDATE_CLINIC_ADMIN = asyncHandler(async (req, res) => {
  const { fullName, email, address, phoneNumber } = req.body;
  const { userId } = req.params;
  const { clinicId } = req.user;

  const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
  if (phoneNumber && !phoneRegex.test(phoneNumber)) {
    throw new ApiError(400, "Invalid phone number format.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format.");
  }

  const user = await ClinicAdmin.findOne({
    _id: userId,
    clinicId,
  });

  if (!user) {
    throw new ApiError(404, "Clinic admin not found.");
  }

  if (email && email !== user.email) {
    const existingUser = await ClinicAdmin.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, "Email already in use.");
    }
    user.email = email;
  }

  if (fullName) user.fullName = fullName;
  if (address) user.address = address;
  if (phoneNumber) user.phoneNumber = phoneNumber;

  await user.save();

  const userObject = user.toObject();
  delete userObject.password;

  return res
    .status(200)
    .json(
      new ApiResponse(200, userObject, "Clinic admin updated successfully.")
    );
});

export const UPDATE_CLINIC_DETAILS = asyncHandler(async (req, res) => {
  const { name, email, address, phoneNumber, latitude, longitude } = req.body;
  const { clinicId } = req.user;

  try {
    // get target clinic, the one whose details will be update from db
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    if ((latitude && isNaN(latitude)) || (longitude && isNaN(longitude))) {
      return res
        .status(400)
        .json({ message: "latitude and latitude must be a number" });
    }

    // same as above api
    if (email) {
      email = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      if (email !== clinic.email) {
        const existingClinic = await Clinic.findOne({ email });
        if (existingClinic) {
          return res.status(400).json({ message: "Email already in use." });
        }
        clinic.email = email;
      }
    }

    if (phoneNumber) {
      phoneNumber = phoneNumber.trim();
      const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res
          .status(400)
          .json({ message: "Invalid phone number format." });
      }
      clinic.phoneNumber = phoneNumber;
    }
    if (name) {
      clinic.name = name;
    }
    if (address) {
      clinic.address = address;
    }
    if (latitude) {
      clinic.latitude = latitude;
    }
    if (longitude) {
      clinic.longitude = longitude;
    }

    await clinic.save();

    res
      .status(200)
      .json({ message: "Clinic details updated successfully", clinic });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

// potential update
export const DELETE_CLINIC_ADMIN = async (req, res) => {
  try {
    // check: is logged-in user is trying to delete its own account
    if (req.user._id === req.params.userId) {
      return res
        .status(400)
        .json({ message: "You cannot delete this account." });
    }

    const clinicAdmin = await ClinicAdmin.findOneAndDelete({
      _id: req.params.userId, // use destructuring
      clinicId: req.user.clinicId,
    });

    if (!clinicAdmin) {
      return res.status(404).json({ message: "Clinic admin not found" });
    }

    res.status(200).json({ message: "Clinic user deleted successfully" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const GET_DOCTOR_BY_REGISTRATION_NUMBER = async (req, res) => {
  try {
    const registrationNumber = req.params.registrationNumber;
    if (!registrationNumber) {
      return res
        .status(400)
        .json({ message: "Registration number is required" });
    }

    const doctor = await Doctor.findOne({
      registrationNumber: registrationNumber,
    }).lean();

    return res.status(200).json({ data: doctor });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const validDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
// clinic must register to add a doctor
export const CREATE_DOCTOR = asyncHandler(async (request, response) => {
  const { clinicId } = request.user;
  let {
    fullName,
    email,
    specialization,
    registrationNumber,
    fee,
    phoneNumber,
    appointmentsSchedule,
    qualification,
    addressLine1,
    addressLine2,
    city,
    gender,
  } = request.body;

  if (
    !fullName ||
    !email ||
    !specialization ||
    !registrationNumber ||
    !fee ||
    !phoneNumber ||
    !qualification ||
    !addressLine1 ||
    !city ||
    !gender
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // appointment schedule validation
    if (appointmentsSchedule) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

      for (const schedule of appointmentsSchedule) {
        const { day, startTime, endTime, maxSlots } = schedule;
        if (!day || !startTime || !endTime || isNaN(maxSlots)) {
          throw new ApiError(
            400,
            "Each schedule must include day, startTime, endTime and maxSlots."
          );
        }
        if (!validDays.includes(day)) {
          throw new ApiError(400, `Invalid Day ${day}`);
        }
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
          throw new ApiError(
            400,
            `Time should be in 24-hour format (HH:MM) for ${day}.`
          );
        }
      }
    }

    // check if doctor is already registered in same clinic
    let doctor = await Doctor.findOne({ registrationNumber });
    if (doctor && doctor.clinics.includes(clinicId)) {
      throw new ApiError(400, "Doctor already exists in this clinic");
    }

    if (doctor) {
      // handling conflicting schedule
      if (appointmentsSchedule) {
        const timeToMinutes = (time) => {
          const [hours, minutes] = time.split(":").map(Number);
          return hours * 60 + minutes;
        };
        // iterate through the appointmentsSchedule provided in the request and compare with the doctor schedule in other clinic
        for (const { day, startTime, endTime } of appointmentsSchedule) {
          const startMinutes = timeToMinutes(startTime);
          const endMinutes = timeToMinutes(endTime);
          // iterate through the doctor schedule in other clinic
          for (const clinic of doctor.appointmentsSchedule) {
            if (clinic.clinicId.toString() !== clinicId.toString()) {
              // conflict detection
              const conflictingSchedule = clinic.schedule.find(
                (appointment) => {
                  if (appointment.day === day) {
                    const appointmentStart = timeToMinutes(
                      appointment.startTime
                    );
                    const appointmentEnd = timeToMinutes(appointment.endTime);
                    return (
                      (startMinutes >= appointmentStart &&
                        startMinutes < appointmentEnd) ||
                      (endMinutes > appointmentStart &&
                        endMinutes <= appointmentEnd) ||
                      (startMinutes <= appointmentStart &&
                        endMinutes >= appointmentEnd)
                    );
                  }
                  return false;
                }
              );

              if (conflictingSchedule) {
                throw new ApiError(
                  400,
                  `Time conflict: Doctor is already scheduled at another clinic on ${day} from ${conflictingSchedule.startTime} to ${conflictingSchedule.endTime}.`
                );
              }
            }
          }
        }
      }

      fee = parseInt(fee);
      doctor.fees.push({ clinicId, fee });
      // doctor exists but it is not associated with current clinic
      if (!doctor.clinics.includes(clinicId)) {
        doctor.clinics.push(clinicId);
        if (appointmentsSchedule) {
          doctor.appointmentsSchedule.push({
            clinicId,
            schedule: appointmentsSchedule,
          });
        }
        await doctor.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return response
        .status(201)
        .json(new ApiResponse(200, "Doctor added successfully"));
    }

    // create a new user to db
    const newDoctor = await Doctor.create(
      [
        {
          fullName,
          email,
          specialization,
          registrationNumber,
          addressLine1,
          addressLine2,
          city,
          gender,
          fees: [{ clinicId, fee }],
          clinics: [clinicId],
          phoneNumber,
          appointmentsSchedule: appointmentsSchedule
            ? [{ clinicId, schedule: appointmentsSchedule }]
            : [],
        },
      ],
      { session }
    );

    // check if user is successfully created
    const createdDoctor = await Doctor.findById(newDoctor[0]._id)
      .select("-password")
      .session(session)
      .lean(); // don't return a complete mongoose doc return a pojo

    await session.commitTransaction();
    session.endSession();

    return response
      .status(201)
      .json(new ApiResponse(200, "Doctor added successfully", createdDoctor));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw new ApiError(
      error.code || 500,
      error.message || "Something went wrong"
    );
  }
});

export const GET_ALL_DOCTORS_BY_CLINIC = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10; // Default limit if not provided
  const skip = (page - 1) * limit;

  // Fetch total doctor count
  const totalDoctors = await Doctor.countDocuments({
    clinics: req.user.clinicId,
  });
  const totalPages = Math.ceil(totalDoctors / limit) || 1;

  // Fetch doctors with pagination
  const doctors = await Doctor.find({ clinics: req.user.clinicId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("-__v");

  // Return success response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { doctors, totalPages },
        "Doctors fetched successfully."
      )
    );
});

export const GET_DOCTOR_BY_ID = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    _id: req.params.doctorId,
    clinics: req.user.clinicId,
  });

  if (!doctor) {
    throw new ApiError(404, "Doctor not found.");
  }

  // Get only the schedule for the current clinic
  const currentClinicSchedule = doctor.appointmentsSchedule.find(
    (schedule) => schedule.clinicId.toString() === req.user.clinicId.toString()
  );

  // Get fee for the current clinic
  const fee = doctor.fees.find(
    (fee) => fee.clinicId.toString() === req.user.clinicId.toString()
  );

  // Return success response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...doctor.toObject(),
        appointmentsSchedule: currentClinicSchedule,
        fees: fee,
      },
      "Doctor details fetched successfully."
    )
  );
});

export const UPDATE_DOCTOR = asyncHandler(async (req, res) => {
  let {
    fullName,
    email,
    specialization,
    phoneNumber,
    fee,
    appointmentsSchedule,
  } = req.body;

  const doctor = await Doctor.findOne({
    _id: req.params.doctorId,
    clinics: { $in: [req.user.clinicId] },
  });

  if (!doctor) {
    throw new ApiError(404, "Doctor not found.");
  }

  // Validate email
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new ApiError(400, "Invalid email format.");
    }
    doctor.email = email.trim().toLowerCase();
  }

  // Validate phone number
  if (phoneNumber) {
    const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
    phoneNumber = phoneNumber.trim();
    if (!phoneRegex.test(phoneNumber)) {
      throw new ApiError(400, "Invalid phone number format.");
    }
    doctor.phoneNumber = phoneNumber;
  }

  if (fullName) doctor.fullName = fullName;
  if (specialization) doctor.specialization = specialization;

  // Update fee for the current clinic
  let fees;
  if (fee) {
    fee = parseInt(fee);
    fees = doctor.fees.find(
      (f) => f.clinicId.toString() === req.user.clinicId.toString()
    );
    if (fees) {
      fees.fee = fee;
    }
  }

  // Update appointments schedule
  if (appointmentsSchedule) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    for (const { day, startTime, endTime, maxSlots } of appointmentsSchedule) {
      if (!day || !startTime || !endTime || isNaN(maxSlots)) {
        throw new ApiError(
          400,
          "Each schedule must include day, startTime, endTime, and maxSlots."
        );
      }
      if (!validDays.includes(day)) {
        throw new ApiError(400, `Invalid day: ${day}`);
      }
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        throw new ApiError(
          400,
          `Time should be in 24-hour format (HH:MM) for ${day}`
        );
      }

      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      for (const clinic of doctor.appointmentsSchedule) {
        if (clinic.clinicId.toString() !== req.user.clinicId.toString()) {
          const conflictingSchedule = clinic.schedule.find((appointment) => {
            if (appointment.day === day) {
              const appointmentStart = timeToMinutes(appointment.startTime);
              const appointmentEnd = timeToMinutes(appointment.endTime);
              return (
                (startMinutes >= appointmentStart &&
                  startMinutes < appointmentEnd) ||
                (endMinutes > appointmentStart &&
                  endMinutes <= appointmentEnd) ||
                (startMinutes <= appointmentStart &&
                  endMinutes >= appointmentEnd)
              );
            }
            return false;
          });

          if (conflictingSchedule) {
            throw new ApiError(
              400,
              `Time conflict: Doctor is already scheduled at another clinic on ${day} from ${conflictingSchedule.startTime} to ${conflictingSchedule.endTime}.`
            );
          }
        }
      }
    }

    let clinicSchedule = doctor.appointmentsSchedule.find(
      (schedule) =>
        schedule.clinicId.toString() === req.user.clinicId.toString()
    );

    if (clinicSchedule) {
      clinicSchedule.schedule = appointmentsSchedule;
    } else {
      doctor.appointmentsSchedule.push({
        clinicId: req.user.clinicId,
        schedule: appointmentsSchedule,
      });
    }
  }

  await doctor.save();

  // Filter the schedule for the current clinic
  const currentClinicSchedule = doctor.appointmentsSchedule.find(
    (schedule) => schedule.clinicId.toString() === req.user.clinicId.toString()
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...doctor.toObject(),
        fees,
        appointmentsSchedule: currentClinicSchedule,
      },
      "Doctor updated successfully."
    )
  );
});

export const DELETE_DOCTOR = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const clinicId = req.user.clinicId;

  // Find the doctor associated with the clinic
  const doctor = await Doctor.findOne({ _id: doctorId, clinics: clinicId });

  if (!doctor) {
    throw new ApiError(404, "Doctor not found.");
  }

  // If doctor is associated with multiple clinics, remove this clinic's data
  if (doctor.clinics.length > 1) {
    await Doctor.updateOne(
      { _id: doctor._id },
      {
        $pull: {
          clinics: clinicId,
          appointmentsSchedule: { clinicId },
          fees: { clinicId },
        },
      }
    );
  } else {
    // If it's the only clinic, delete the entire doctor record
    await Doctor.deleteOne({ _id: doctor._id });
  }

  // Return success response
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Doctor deleted successfully."));
});

//* not tested yet
export const DELETE_DAY_SCHEDULE = asyncHandler(async (req, res) => {
  const { scheduledId, doctorId } = req.body;
  const clinicId = req.user.clinicId;

  // Validate required fields
  if (!scheduledId || !doctorId) {
    throw new ApiError(400, "All fields are required.");
  }

  // Find doctor in the clinic
  const doctor = await Doctor.findOne({ _id: doctorId, clinics: clinicId });
  if (!doctor) {
    throw new ApiError(404, "Doctor not found.");
  }

  // Find the clinic's appointment schedule
  const clinicSchedule = doctor.appointmentsSchedule.find(
    (schedule) => schedule.clinicId.toString() === clinicId.toString()
  );

  if (!clinicSchedule) {
    throw new ApiError(404, "Clinic schedule not found.");
  }

  // Find the index of the appointment schedule
  const scheduleIndex = clinicSchedule.schedule.findIndex(
    (appointment) => appointment._id.toString() === scheduledId.toString()
  );

  if (scheduleIndex === -1) {
    throw new ApiError(404, "Appointment schedule not found.");
  }

  // Remove the appointment schedule
  clinicSchedule.schedule.splice(scheduleIndex, 1);

  // If no schedules left for the clinic, remove the clinic from the doctor's schedule
  if (clinicSchedule.schedule.length === 0) {
    doctor.appointmentsSchedule = doctor.appointmentsSchedule.filter(
      (schedule) => schedule.clinicId.toString() !== clinicId.toString()
    );
  }

  await doctor.save();

  // Return success response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { appointmentsSchedule: doctor.appointmentsSchedule },
        "Clinic appointment schedule deleted successfully."
      )
    );
});

export const GET_ALL_APPOINTMENTS_CLINIC = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get total appointment count
  const totalAppointments = await Appointment.countDocuments({ clinicId });
  const totalPages = Math.ceil(totalAppointments / limit) || 1;

  // Fetch paginated appointments
  const appointments = await Appointment.find({ clinicId })
    .select("-__v -totalAmount -amountPaid -paymentId -orderId -paymentMethod")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Return success response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { appointments, totalPages },
        "Appointments retrieved successfully."
      )
    );
});
