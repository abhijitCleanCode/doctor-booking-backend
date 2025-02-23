import { Router } from "express";
import {
  CREATE_CLINIC_ADMIN,
  CREATE_DOCTOR,
  DELETE_CLINIC_ADMIN,
  DELETE_DOCTOR,
  GET_ALL_APPOINTMENTS_CLINIC,
  GET_ALL_DOCTORS_BY_CLINIC,
  GET_CLINIC_BY_CITIES,
  GET_CLINICS_DETAILS,
  GET_DOCTOR_BY_ID,
  GET_DOCTOR_BY_REGISTRATION_NUMBER,
  GETALLCLINICADMINS,
  GETCLINICADMINBYID,
  LOGINCLINIC,
  SIGNUPCLINIC,
  UPDATE_CLINIC_ADMIN,
  UPDATE_CLINIC_DETAILS,
  UPDATE_DOCTOR,
} from "../controllers/clinic.controller.js";
import { VERIFY_FOR_CLINIC } from "../middlewares/auth.middleware.js";

const clinicRouter = Router();

clinicRouter.post("/sign-up", SIGNUPCLINIC);
clinicRouter.post("/login", LOGINCLINIC);
clinicRouter.post("/create-admin", VERIFY_FOR_CLINIC, CREATE_CLINIC_ADMIN);
clinicRouter.get("/get-clinic-details", VERIFY_FOR_CLINIC, GET_CLINICS_DETAILS);
clinicRouter.put("/update-clinic", VERIFY_FOR_CLINIC, UPDATE_CLINIC_DETAILS);
clinicRouter.get(
  "/get-all-clinic-admin",
  VERIFY_FOR_CLINIC,
  GETALLCLINICADMINS
);
clinicRouter.get(
  "/get-clinic-admin/:userId",
  VERIFY_FOR_CLINIC,
  GETCLINICADMINBYID
);
clinicRouter.put(
  "/update-clinic-admin/:userId",
  VERIFY_FOR_CLINIC,
  UPDATE_CLINIC_ADMIN
);
clinicRouter.delete(
  "/delete-clinic-admin/:userId",
  VERIFY_FOR_CLINIC,
  DELETE_CLINIC_ADMIN
);
clinicRouter.post("/add-doctor", VERIFY_FOR_CLINIC, CREATE_DOCTOR);
clinicRouter.get("/get-doctors", VERIFY_FOR_CLINIC, GET_ALL_DOCTORS_BY_CLINIC);
clinicRouter.get("/get-doctor/:doctorId", VERIFY_FOR_CLINIC, GET_DOCTOR_BY_ID);
clinicRouter.get(
  "/get-doctor/registration-number/:registrationNumber",
  VERIFY_FOR_CLINIC,
  GET_DOCTOR_BY_REGISTRATION_NUMBER
);
clinicRouter.put("/update-doctor/:doctorId", VERIFY_FOR_CLINIC, UPDATE_DOCTOR);
clinicRouter.delete(
  "/delete-doctor/:doctorId",
  VERIFY_FOR_CLINIC,
  DELETE_DOCTOR
);
clinicRouter.get(
  "/get-appointments",
  VERIFY_FOR_CLINIC,
  GET_ALL_APPOINTMENTS_CLINIC
);
clinicRouter.route("/get-clinic-by-city/:city").get(GET_CLINIC_BY_CITIES);

export default clinicRouter;
