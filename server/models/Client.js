import mongoose from "mongoose";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Digits plus the usual separators: "+1 (555) 010-2030", "98765 43210", "555.010.2030".
export const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/;

const ClientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      minlength: [2, "Client name must be at least 2 characters"],
      maxlength: [80, "Client name must be at most 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [EMAIL_PATTERN, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [PHONE_PATTERN, "Please enter a valid phone number"],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [80, "Company name must be at most 80 characters"],
    },
    // Either an uploaded Cloudinary image (avatarPublicId set) or any image URL.
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: [2048, "Image URL is too long"],
      match: [/^https?:\/\/\S+$/i, "Image URL must start with http:// or https://"],
    },
    avatarPublicId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Client", ClientSchema);
