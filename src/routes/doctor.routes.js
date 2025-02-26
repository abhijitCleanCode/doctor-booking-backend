import { Router } from "express";
import {
  ADD_SPECIALIZATION,
  GET_ALL_DOCTORS,
  GET_ALL_SPECIALIZATION,
  GET_DOCTOR_BY_CITY,
  GET_DOCTOR_BY_SPECIALIZATION,
} from "../controllers/doctor.controller.js";

const doctorRouter = Router();

doctorRouter.route("/get-all-doctors").get(GET_ALL_DOCTORS);
doctorRouter.route("/get-doctor-by-city").get(GET_DOCTOR_BY_CITY);
doctorRouter
  .route("/get-doctor-by-specialization")
  .get(GET_DOCTOR_BY_SPECIALIZATION);
doctorRouter.route("/get-all-specialization").get(GET_ALL_SPECIALIZATION);
doctorRouter.route("/add-specialization").post(ADD_SPECIALIZATION);

export default doctorRouter;
