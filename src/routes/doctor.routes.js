import { Router } from "express";
import {
  GET_DOCTOR_BY_CITY,
  GET_DOCTOR_BY_SPECIALIZATION,
} from "../controllers/doctor.controller";

const doctorRouter = Router();

doctorRouter.route("/get-doctor-by-city", GET_DOCTOR_BY_CITY);
doctorRouter.route(
  "/get-doctor-by-specialization",
  GET_DOCTOR_BY_SPECIALIZATION
);

export default doctorRouter;
