import { errorResponse } from "../helpers/ResponseHelper.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return errorResponse(res, errors, "Validasi tidak valid");
    }
    next();
  };
};
