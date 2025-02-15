import mongoose from "mongoose";
import { OTP } from "../models/otp.model.js";
import SibApiV3Sdk from "sib-api-v3-sdk";
import otpGenerator from "otp-generator";
import { rateLimit } from "express-rate-limit";
import { asyncHandler } from "./asyncHandler.utils.js";
import { ApiError } from "./ApiError.utils.js";
import { ApiResponse } from "./ApiResponse.utils.js";
import { VERIFICATION_EMAIL_TEMPLATE } from "./template.js";

// limits the number of requests an email address can make within a given timeframe, express specific
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each user to 3 OTP requests per hour
  message: "Too many OTP requests. Please try again later.",
  keyGenerator: (req) => req.body.email, // Rate-limit by email instead of IP
});

export const generateOTP = () => {
  return otpGenerator.generate(6, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
};

// brevo email setup
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"]; // Configure API key authorization
apiKey.apiKey = process.env.BREVO_EMAIL_VERIFICATION_API_KEY;

const SEND_EMAIL = async (toEmail, subject, htmlContent) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender = {
    email: process.env.SENDER_EMAIL,
    name: "BookmyDoct",
  };
  sendSmtpEmail.to = [{ email: toEmail }];
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const SEND_OTP_EMAIL = async (email, otp) => {
  const subject = "Your OTP for Email verification";
  const htmlContent = VERIFICATION_EMAIL_TEMPLATE.replace(
    "{verificationCode}",
    otp
  );

  await SEND_EMAIL(email, subject, htmlContent);
};

export const SEND_OTP = asyncHandler(async (request, response) => {
  const { email } = request.body;
  // validate required fields
  if (!email) throw new ApiError(400, "Email is required");

  // Start a MongoDB session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // check if email exists
    const emailExists = await OTP.findOne({ email }).session(session);
    if (emailExists && emailExists.expiresAt > Date.now()) {
      throw new ApiError(400, "OTP already sent to this email");
    }

    const otp = generateOTP();

    // save the otp to db
    await OTP.create(
      [
        {
          email,
          otp,
          expiresAt: Date.now() + 5 * 60 * 1000,
        },
      ],
      { session }
    );

    // send otp via email
    await SEND_OTP_EMAIL(email, otp);

    // Commit the transaction to the database
    await session.commitTransaction();
    session.endSession();

    return response
      .status(201)
      .json(new ApiResponse(200, otp, "OTP sent successfully!"));
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
