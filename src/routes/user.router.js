import { Router } from "express";
import { otpLimiter, SEND_OTP } from "../utils/otp.utils.js";
import {
  APPOINTMENT_WEB_HOOK,
  CREATE_APPOINTMENT,
  GET_ALL_DATA,
  GET_ALL_DOCTORS,
  GET_CLINIC_DETAILS_FOR_USER,
  GET_DOCTOR_BY_ID,
  GETUSER,
  LOGINUSER,
  LOGOUTUSER,
  SIGNUPUSER,
  VERIFY_OTP,
} from "../controllers/user.controllers.js";
import { VERIFY_FOR_USER } from "../middlewares/auth.middleware.js";
const userRouter = Router();

userRouter.post("/email-verification/send-otp", otpLimiter, SEND_OTP);
userRouter.post("/email-verification/verify-otp", VERIFY_OTP);
userRouter.post("/sign-up", SIGNUPUSER);
userRouter.post("/login", LOGINUSER);
userRouter.get("/get-user", VERIFY_FOR_USER, GETUSER);
// update user is yet to implemented
userRouter.post("/logout", LOGOUTUSER);
userRouter.get("/doctors/getalldoctors", GET_ALL_DOCTORS);
userRouter.get("/doctors/getdoctorbyid/:doctorId", GET_DOCTOR_BY_ID);
userRouter.get("/clinicdetails/:clinicId", GET_CLINIC_DETAILS_FOR_USER);
userRouter.post("/create-appointments", VERIFY_FOR_USER, CREATE_APPOINTMENT);
userRouter.post("/verify-payment", VERIFY_FOR_USER, APPOINTMENT_WEB_HOOK);
userRouter.get("/get-all-data", VERIFY_FOR_USER, GET_ALL_DATA);
// get all appointment
// get appointment by id
// get doctor slot api is yet to implemented

export default userRouter;
