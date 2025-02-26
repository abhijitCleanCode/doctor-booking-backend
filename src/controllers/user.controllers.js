import mongoose from "mongoose";
import crypto from "crypto";
import { OTP } from "../models/otp.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { AdminCommission } from "../models/adminCommission.model.js";
import { Doctor } from "../models/doctor.model.js";
import { Clinic } from "../models/clinic.model.js";
import { Appointment } from "../models/appointment.model.js";
import { razorpayInstance } from "../utils/razorpay.utils.js";

const generateAccessToken_RefreshToken = async function (userId) {
  try {
    const user = await User.findById(userId);
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

export const VERIFY_OTP = asyncHandler(async (request, response) => {
  const { email, otp } = request.body;
  console.log("email :: ", email, "otp :: ", otp);

  if (!email || !otp) throw new ApiError(404, "Email and OTP are required");

  const otpRecord = await OTP.findOne({ email });
  console.log("otpRecord :: ", otpRecord);

  if (!otpRecord || !otpRecord.email)
    throw new ApiError(404, "OTP not found for this email");

  // check if otp has expired
  if (otpRecord.expiresAt < Date.now())
    throw new ApiError(400, "OTP has expired");

  // verify otp
  const isOtpValid = await otpRecord.compareOtp(otp);
  if (!isOtpValid) throw new ApiError(400, "Invalid OTP");

  // delete the OTP record after successful verification
  await OTP.deleteOne({ email });

  return response
    .status(200)
    .json(new ApiResponse(200, null, "OTP verified successfully!"));
});

export const SIGNUPUSER = asyncHandler(async (request, response) => {
  const {
    fullName = "",
    avatar = "",
    email = "",
    phoneNumber = "",
    address = "",
    password = "",
  } = request.body;

  if (
    [fullName, email, phoneNumber, address, password].some(
      (field) => field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Start a MongoDB session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existedUser = await User.findOne({ email }).session(session);
    if (existedUser) {
      throw new ApiError(409, "User already exists");
    }

    // create a new user to db
    const user = await User.create(
      [
        {
          fullName,
          avatar,
          email,
          phoneNumber,
          address,
          password,
        },
      ],
      { session }
    );

    // check if user is successfully created
    const createdUser = await User.findById(user[0]._id)
      .select("-password -refreshToken")
      .session(session);
    if (!createdUser) {
      throw new ApiError(500, "Uh oh! User registration failed");
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Return success response
    return response
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered Successfully!"));
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();

    // Handle the error
    throw new ApiError(
      error.code || 500,
      error.message || "Something went wrong"
    );
  }
});

export const LOGINUSER = asyncHandler(async (request, response) => {
  // request body -> data
  // extract data (obj destrucring)
  // find the user from DB
  // password check
  // generate access and refresh token

  const { email = "", password = "" } = request.body;

  if ([email, password].some((field) => field.trim() === ""))
    throw new ApiError(400, "All fields are required");

  // search for user
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // verify password. user -> db instance created via User thus your define methods can be access using user
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid user credentials");

  // generate access and refresh token
  const { accessToken, refreshToken } = await generateAccessToken_RefreshToken(
    user._id
  );

  // Don't send password to front-end
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return response
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully!"
      )
    );
});

export const GETUSER = asyncHandler(async (request, response) => {
  const user = await User.findById(request.user._id).select(
    "-password -refreshToken"
  );
  return response.status(200).json(new ApiResponse(200, user));
});

export const LOGOUTUSER = asyncHandler(async (request, response) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this remove the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return response
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully!"));
});

export const GET_ALL_DOCTORS = asyncHandler(async (req, res) => {
  // Fetch platform fee, defaulting to 1 if not found
  const platform = await AdminCommission.findOne({});
  const platformFee = platform?.platFormFee || 1;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10; // Default limit to 10 if not provided
  const skip = (page - 1) * limit;

  // Get total doctors count
  const totalDoctors = await Doctor.countDocuments();
  const totalPages = Math.ceil(totalDoctors / limit) || 1;

  // Fetch doctors with pagination
  const doctors = await Doctor.find()
    .populate("clinics", "name address phoneNumber email")
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
        { doctors, platformFee, totalPages },
        "Doctors retrieved successfully."
      )
    );
});

export const GET_ALL_CLINICS = asyncHandler(async (req, res) => {
  const { populate, limit, page } = req.query;

  // Pagination setup
  const limitValue = parseInt(limit) || 10;
  const pageValue = parseInt(page) || 1;
  const skip = (pageValue - 1) * limitValue;

  // Build the query
  let query = Clinic.find();

  // Populate doctors if requested
  if (populate === "true") {
    query = query.populate("doctors", "fullName specialization");
  }

  // Apply pagination
  query = query.skip(skip).limit(limitValue);

  // Execute the query
  const clinics = await query;

  if (!clinics.length) {
    throw new ApiError(404, "No clinics found.");
  }

  // Count total clinics for pagination metadata
  const totalClinics = await Clinic.countDocuments();

  // Return the response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        clinics,
        pagination: {
          totalClinics,
          currentPage: pageValue,
          totalPages: Math.ceil(totalClinics / limitValue),
        },
      },
      "Clinics fetched successfully."
    )
  );
});

export const GET_ALL_CITIES = asyncHandler(async (req, res) => {
  // Fetch all unique cities from the clinic collection
  const cities = await Clinic.distinct("city");

  if (!cities.length) {
    throw new ApiError(404, "No cities found.");
  }

  // Return the response
  return res
    .status(200)
    .json(new ApiResponse(200, cities, "Cities fetched successfully."));
});

export const GET_DOCTOR_BY_ID = asyncHandler(async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.doctorId);

    if (!doctor) {
      throw new ApiError(404, "Doctor not found.");
    }

    // Return success response
    return res
      .status(200)
      .json(new ApiResponse(200, { doctor }, "Doctor retrieved successfully."));
  } catch (error) {
    throw new ApiError(
      error.code || 500,
      error.message || "Internal Server Error"
    );
  }
});

const genders = ["male", "female", "other"];
// create doctor appointment
// Ensure Razorpay instance is properly initialized
export const CREATE_APPOINTMENT = asyncHandler(async (req, res) => {
  try {
    let {
      doctorId,
      scheduledId,
      fullName,
      phoneNumber,
      age,
      gender,
      healthInsured,
      clinicId,
      billingAddress,
      termsAccepted,
      appointmentDate,
    } = req.body;

    // ✅ Required Fields Validation
    if (
      !doctorId ||
      !scheduledId ||
      !fullName ||
      !phoneNumber ||
      !age ||
      !gender ||
      !clinicId ||
      !appointmentDate
    ) {
      throw new ApiError(400, "All required fields must be filled.");
    }

    // ✅ Date Format Validation (dd-mm-yyyy)
    const validDateRegex =
      /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(19|20)\d{2}$/;
    if (!validDateRegex.test(appointmentDate)) {
      throw new ApiError(
        400,
        "Invalid date format. Accepted format: dd-mm-yyyy."
      );
    }

    // ✅ Boolean Fields Validation
    if (
      typeof termsAccepted !== "boolean" ||
      typeof healthInsured !== "boolean"
    ) {
      throw new ApiError(
        400,
        "Terms and conditions and health insurance status are required."
      );
    }

    if (!termsAccepted) {
      throw new ApiError(400, "Please accept the terms and conditions.");
    }

    // ✅ Fetch Clinic & Doctor
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new ApiError(404, "Clinic not found.");

    const doctor = await Doctor.findOne({ _id: doctorId, clinics: clinicId });
    if (!doctor) throw new ApiError(404, "Doctor not found.");

    // ✅ Fetch Clinic Schedule
    const clinicSchedule = doctor.appointmentsSchedule.find(
      (schedule) => schedule.clinicId.toString() === clinicId.toString()
    );

    if (!clinicSchedule) throw new ApiError(404, "Clinic schedule not found.");

    // ✅ Find Scheduled Appointment
    const scheduleIndex = clinicSchedule.schedule.findIndex(
      (appointment) => appointment._id.toString() === scheduledId.toString()
    );

    if (scheduleIndex === -1)
      throw new ApiError(404, "Appointment schedule not found.");

    const {
      day: appointmentDay,
      startTime: appointmentTimeFrom,
      endTime: appointmentTimeTo,
      maxSlots,
    } = clinicSchedule.schedule[scheduleIndex];

    // ✅ Check Slot Availability
    const bookedSlot = await Appointment.countDocuments({
      clinicId,
      doctor: doctorId,
      appointmentDate,
      appointmentTimeFrom,
      appointmentTimeTo,
    });

    if (bookedSlot >= maxSlots) {
      throw new ApiError(
        400,
        "Maximum limit for appointment reached. Please choose another date or time."
      );
    }

    // ✅ Gender Validation (Ensure lowercase and valid entry)
    gender = gender.toLowerCase();
    const validGenders = ["male", "female", "other"];
    if (!validGenders.includes(gender)) {
      throw new ApiError(400, "Invalid gender provided.");
    }

    // ✅ Fetch Platform Fee
    const platformData = await AdminCommission.findOne({});
    const platformFee = platformData?.platFormFee || 1;

    console.log(
      "\nplatformFee :: ",
      platformFee,
      "\nplatformData :: ",
      platformData,
      "\nreq.user :: ",
      req.user
    );

    // ✅ Razorpay Payment Metadata
    const metadata = {
      userId: req.user._id,
      appointmentDate,
      doctorId,
      appointmentDay,
      appointmentTimeFrom,
      appointmentTimeTo,
      fullName,
      phoneNumber,
      age,
      gender,
      healthInsured,
      clinicId,
      billingAddress,
      termsAccepted,
    };

    // ✅ Create Razorpay Order
    const options = {
      amount: platformFee * 100,
      currency: "INR",
      receipt: `receipt_${req.user._id}`,
      payment_capture: 1, // Auto capture payment
      notes: metadata,
    };

    const order = await razorpayInstance.orders.create(options);

    // ✅ Send Response
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          order_id: order.id,
          amount: platformFee * 100,
          key_id: process.env.RAZORPAY_KEY_ID,
          user: req.user._id,
        },
        "Appointment created successfully. Proceed with payment."
      )
    );
  } catch (error) {
    throw new ApiError(
      error.code || 500,
      error.message || "Internal Server Error"
    );
  }
});
export const APPOINTMENT_WEB_HOOK = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    console.log("signature :: ", signature);

    function verifyWebhookSignature(body, signature, secret) {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(body))
        .digest("hex");
      return expectedSignature === signature;
    }

    const isValid = verifyWebhookSignature(req.body, signature, razorpaySecret);
    console.log("IsValid", isValid);

    if (isValid) {
      const { event, payload } = req.body;
      switch (event) {
        case "payment.captured":
          const paymentData = payload.payment.entity;

          const doctorId = paymentData.notes.doctorId;
          const appointmentDay = paymentData.notes.appointmentDay;
          const appointmentDate = paymentData.notes.appointmentDate;
          const appointmentTimeFrom = paymentData.notes.appointmentTimeFrom;
          const appointmentTimeTo = paymentData.notes.appointmentTimeTo;
          const fullName = paymentData.notes.fullName;
          const phoneNumber = paymentData.notes.phoneNumber;
          const age = paymentData.notes.age;
          const gender = paymentData.notes.gender;
          const clinicId = paymentData.notes.clinicId;
          const billingAddress = paymentData.notes.billingAddress;
          const termsAccepted = paymentData.notes.termsAccepted;
          const healthInsured = paymentData.notes.healthInsured;
          const orderId = paymentData.order_id;
          const userId = paymentData.notes.userId;
          const amountPaid = paymentData.amount / 100; // Convert to rupees
          const totalAmount = paymentData?.amount / 100;

          const commission = await AdminCommission.findOne({});
          const bookingCommission =
            ((commission?.bookingCommission * totalAmount) / 100).toFixed(2) ||
            0;

          const doctor = await Doctor.findById(doctorId);
          const doctorName = doctor.fullName;
          const specialization = doctor.specialization;

          const fees = doctor.fees.find(
            (fee) => fee.clinicId.toString() === clinicId.toString()
          );
          const doctorFee = fees.fee;

          const clinic = await Clinic.findById(clinicId);
          const clinicName = clinic.name;
          const clinicAddress = clinic.address;
          const clinicNumber = clinic.phoneNumber;

          const appointment = new Appointment({
            createdBy: userId,
            doctor: doctorId,
            doctorName,
            specialization,
            doctorFee,
            clinicName,
            clinicAddress,
            clinicNumber,
            fullName,
            phoneNumber,
            age,
            gender,
            appointmentDay,
            appointmentDate,
            appointmentTimeFrom,
            appointmentTimeTo,
            healthInsured,
            paymentMethod: paymentData.method || "unknown",
            amountPaid,
            paymentId: paymentData.id,
            orderId,
            clinicId,
            billingAddress,
            bookingCommission,
            paymentStatus: "Paid",
            termsAccepted,
            totalAmount,
          });

          await appointment.save();

          return res.status(201).json({
            message: "Appointment created successfully",
            appointment,
          });
      }
    }
    return res.status(200).send();
  } catch (error) {
    console.log(error);
  }
};

// get all user appointments

// get user appointment by id

export const GET_CLINIC_DETAILS_FOR_USER = asyncHandler(async (req, res) => {
  try {
    const { clinicId } = req.params;
    const clinic = await Clinic.findById(clinicId);

    if (!clinic) {
      throw new ApiError(404, "Clinic not found.");
    }

    // Return success response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { clinicDetails: clinic },
          "Clinic details retrieved successfully."
        )
      );
  } catch (error) {
    throw new ApiError(
      error.code || 500,
      error.message || "Internal Server Error"
    );
  }
});

export const GET_DOCTOR_SLOTS = asyncHandler(async (req, res) => {
  try {
    let { doctorId, clinicId, scheduledId, appointmentDate } = req.query;

    // Validate required fields
    if (!doctorId || !clinicId || !scheduledId || !appointmentDate) {
      throw new ApiError(
        400,
        "Doctor Id, Clinic Id, Scheduled Id, and Appointment Date are required."
      );
    }

    // Validate appointment date format
    const validDateRegex =
      /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(19|20)\d{2}$/;
    if (!validDateRegex.test(appointmentDate)) {
      throw new ApiError(
        400,
        "Invalid date format. Accepted format: dd-mm-yyyy."
      );
    }

    // Fetch clinic and doctor
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) throw new ApiError(404, "Clinic not found.");

    const doctor = await Doctor.findOne({ _id: doctorId, clinics: clinicId });
    if (!doctor) throw new ApiError(404, "Doctor not found.");

    // Find clinic schedule
    const clinicSchedule = doctor.appointmentsSchedule.find(
      (schedule) => schedule.clinicId.toString() === clinicId.toString()
    );

    if (!clinicSchedule) throw new ApiError(404, "Clinic schedule not found.");

    // Find specific scheduled appointment
    const scheduleIndex = clinicSchedule.schedule.findIndex(
      (appointment) => appointment._id.toString() === scheduledId.toString()
    );

    if (scheduleIndex === -1)
      throw new ApiError(404, "Appointment schedule not found.");

    const {
      startTime: appointmentTimeFrom,
      endTime: appointmentTimeTo,
      maxSlots,
    } = clinicSchedule.schedule[scheduleIndex];

    // Count booked slots
    const bookedSlot = await Appointment.countDocuments({
      clinicId,
      doctor: doctorId,
      appointmentDate,
      appointmentTimeFrom,
      appointmentTimeTo,
    });

    // Return structured response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { scheduledId, clinicId, doctorId, maxSlots, bookedSlot },
          "Doctor slots retrieved successfully."
        )
      );
  } catch (error) {
    throw new ApiError(
      error.code || 500,
      error.message || "Internal Server Error"
    );
  }
});

export const GET_ALL_DATA = async (req, res) => {
  try {
    const { location, searchOn, query } = req.query;

    // if (!location || !searchOn || !query) {
    //   return res.status(400).json({
    //     message:
    //       "Missing required query parameters: location, searchOn, or query",
    //   });
    // }

    let results;

    if (searchOn === "clinic") {
      // Fetch clinics based on location and query (e.g., specialization or clinic name)
      results = await Clinic.find({
        city: location,
        $or: [
          { name: { $regex: query, $options: "i" } }, // Case-insensitive search for clinic name
          { specialization: { $regex: query, $options: "i" } }, // Case-insensitive search for specialization
        ],
      });
    } else if (searchOn === "doctor") {
      // Fetch doctors based on location and query (e.g., specialization or doctor name)
      results = await Doctor.find({
        city: location,
        $or: [
          { fullName: { $regex: query, $options: "i" } }, // Case-insensitive search for doctor name
          { specialization: { $regex: query, $options: "i" } }, // Case-insensitive search for specialization
        ],
      });
    } else {
      return res.status(400).json({
        message: 'Invalid value for searchOn. Use "clinic" or "doctor".',
      });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the given criteria" });
    }

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const CREATEAPPOINTMENT = asyncHandler(async (request, response) => {
//   const {
//     doctorId,
//     scheduledId,
//     fullName,
//     phoneNumber,
//     age,
//     gender,
//     healthInsured,
//     clinicId,
//     billingAddress,
//     termsAccepted,
//     appointmentDate,
//   } = request.body;

//   if (
//     !doctorId ||
//     !scheduledId ||
//     !fullName ||
//     !phoneNumber ||
//     !age ||
//     !gender ||
//     !clinicId ||
//     !appointmentDate
//   ) {
//     throw new ApiError(400, "All required fields must be filled");
//   }

//   const validDateRegex =
//     /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(19|20)\d{2}$/;
//   if (!validDateRegex.test(appointmentDate)) {
//     throw new ApiError(400, "Invalid date format. Accepted format: dd-mm-yyyy");
//   }

//   if (
//     typeof termsAccepted !== "boolean" ||
//     typeof healthInsured !== "boolean"
//   ) {
//     throw new ApiError(
//       400,
//       "Terms and conditions and health insurance are required"
//     );
//   }

//   if (!termsAccepted) {
//     throw new ApiError(400, "Please accept the terms and conditions");
//   }

//   // Start a MongoDB session
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const clinic = await Clinic.findById(clinicId).session(session);
//     if (!clinic) {
//       throw new ApiError(404, "Clinic not found");
//     }

//     const doctor = await Doctor.findOne({
//       _id: doctorId,
//       clinics: clinicId,
//     }).session(session);
//     if (!doctor) {
//       throw new ApiError(404, "Doctor not found");
//     }

//     const clinicSchedule = doctor.appointmentsSchedule.find(
//       (schedule) => schedule.clinicId.toString() === clinicId.toString()
//     );

//     if (!clinicSchedule) {
//       throw new ApiError(404, "Clinic schedule not found");
//     }

//     const scheduleIndex = clinicSchedule.schedule.findIndex(
//       (appointment) => appointment._id.toString() === scheduledId.toString()
//     );

//     if (scheduleIndex === -1) {
//       throw new ApiError(404, "Appointment schedule not found");
//     }

//     const appointmentDay = clinicSchedule.schedule[scheduleIndex].day;
//     const appointmentTimeFrom =
//       clinicSchedule.schedule[scheduleIndex].startTime;
//     const appointmentTimeTo = clinicSchedule.schedule[scheduleIndex].endTime;
//     const maxSlots = clinicSchedule.schedule[scheduleIndex].maxSlots;

//     const bookedSlot = await Appointment.countDocuments({
//       clinicId,
//       doctor: doctorId,
//       appointmentDate,
//       appointmentTimeFrom,
//       appointmentTimeTo,
//     }).session(session);

//     if (bookedSlot >= maxSlots) {
//       throw new ApiError(
//         400,
//         "Maximum limit for appointment reached. Please choose another date or time available."
//       );
//     }

//     gender = gender.toLowerCase();
//     if (!genders.includes(gender)) {
//       throw new ApiError(400, "Invalid gender");
//     }

//     const platForm = await AdminCommission.findOne({}).session(session);
//     const platFormFee = platForm?.platFormFee || 1;

//     const metadata = {
//       userId: request.user._id,
//       appointmentDate,
//       doctorId,
//       appointmentDay,
//       appointmentTimeFrom,
//       appointmentTimeTo,
//       fullName,
//       phoneNumber,
//       age,
//       gender,
//       healthInsured,
//       clinicId,
//       billingAddress,
//       termsAccepted,
//     };

//     // Create Razorpay order
//     const options = {
//       amount: platFormFee * 100,
//       currency: "INR",
//       receipt: `receipt_${request?.user?._id}`,
//       payment_capture: 1, // Auto capture the payment
//       notes: metadata,
//     };

//     const order = await razorpayInstance.orders.create(options);

//     // Commit the transaction
//     await session.commitTransaction();
//     session.endSession();

//     // Return success response
//     return response.status(200).json(
//       new ApiResponse(
//         200,
//         {
//           order_id: order.id,
//           amount: platFormFee * 100,
//           key_id: process.env.RAZORPAY_KEY_ID,
//           user: request?.user._id,
//         },
//         "Razorpay order created successfully"
//       )
//     );
//   } catch (error) {
//     // Abort the transaction in case of an error
//     await session.abortTransaction();
//     session.endSession();

//     // Handle the error
//     throw new ApiError(
//       error.code || 500,
//       error.message || "Something went wrong"
//     );
//   }
// });
