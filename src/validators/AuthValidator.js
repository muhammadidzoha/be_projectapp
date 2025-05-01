import Joi from "joi";

export const registerParentValidator = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    "string.empty": "Username tidak boleh kosong",
    "string.min": "Username harus memiliki minimal 3 karakter",
    "string.max": "Username tidak boleh lebih dari 30 karakter",
    "any.required": "Username wajib diisi",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Email tidak valid",
    "string.empty": "Email tidak boleh kosong",
    "any.required": "Email wajib diisi",
  }),
  password: Joi.string().min(6).max(30).required().messages({
    "string.empty": "Password tidak boleh kosong",
    "string.min": "Password harus memiliki minimal 6 karakter",
    "string.max": "Password tidak boleh lebih dari 30 karakter",
    "any.required": "Password wajib diisi",
  }),
  role_id: Joi.number().valid(1, 2, 3, 4, 5).required().messages({
    "number.base": "Role ID harus berupa angka",
    "any.only": "Role ID tidak valid",
    "any.required": "Role ID wajib diisi",
  }),
});

export const registerInstitutionValidator = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    "string.base": "Username harus berupa string",
    "string.empty": "Username tidak boleh kosong",
    "string.min": "Username harus memiliki minimal 3 karakter",
    "string.max": "Username tidak boleh lebih dari 30 karakter",
    "any.required": "Username wajib diisi",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Email tidak valid",
    "string.empty": "Email tidak boleh kosong",
    "any.required": "Email wajib diisi",
  }),
  password: Joi.string().min(6).max(30).required().messages({
    "string.empty": "Password tidak boleh kosong",
    "string.min": "Password harus memiliki minimal 6 karakter",
    "string.max": "Password tidak boleh lebih dari 30 karakter",
    "any.required": "Password wajib diisi",
  }),
  role_id: Joi.number().valid(1, 2, 3, 4, 5).required().messages({
    "number.base": "Role ID harus berupa angka",
    "any.only": "Role ID tidak valid",
    "any.required": "Role ID wajib diisi",
  }),
  institutionName: Joi.string().required().messages({
    "string.empty": "Nama institusi tidak boleh kosong",
    "any.required": "Nama institusi wajib diisi",
  }),
  institutionEmail: Joi.string().email().required().messages({
    "string.email": "Email institusi tidak valid",
    "string.empty": "Email institusi tidak boleh kosong",
    "any.required": "Email institusi wajib diisi",
  }),
  institutionPhone: Joi.string().required().messages({
    "string.empty": "Telepon institusi tidak boleh kosong",
    "any.required": "Telepon institusi wajib diisi",
  }),
  institutionAddress: Joi.string().required().messages({
    "string.empty": "Alamat institusi tidak boleh kosong",
    "any.required": "Alamat institusi wajib diisi",
  }),
  institutionProvince: Joi.number().required().messages({
    "number.base": "ID provinsi harus berupa angka",
    "any.required": "ID provinsi wajib diisi",
  }),
  institutionCity: Joi.number().required().messages({
    "number.base": "ID kota harus berupa angka",
    "any.required": "ID kota wajib diisi",
  }),
  institutionType: Joi.number().valid(1, 2).required().messages({
    "any.only": "Tipe institusi tidak valid",
    "any.required": "Tipe institusi wajib diisi",
  }),
});
