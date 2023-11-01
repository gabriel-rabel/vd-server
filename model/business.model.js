import { Schema, model } from "mongoose";

const businessSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    cnpj: {
      type: String,
      trim: true,
      unique: true,
      match: /^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/, // match = regex
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },
    logo: {
      type: String,
      default: "https://cdn.wallpapersafari.com/92/63/wUq2AY.jpg",
    },
    role: { type: String, enum: ["ADMIN", "BUSINESS"], default: "BUSINESS" },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    resetPassword: { type: String, default: "" },
    active: { type: Boolean, default: true },
    description: { type: String },
    offers: [{ type: Schema.Types.ObjectId, ref: "Job" }],
    address: {
      street: { type: String, trim: true },
      number: { type: String, trim: true },
      neighborhood: { type: String, trim: true },
      cep: { type: String, trim: true },
      complement: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

export default model("Business", businessSchema);
