import mongoose from "mongoose";

export const PROJECT_STATUSES = ["Not Started", "In Progress", "Completed"];
export const PROJECT_PRIORITIES = ["Low", "Medium", "High"];
export const MAX_ATTACHMENTS = 20;

// A file stored on Cloudinary. resourceType is Cloudinary's: "image" (also
// covers PDFs), "video" (also audio) or "raw" (documents and everything else).
const AttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "video", "raw"], required: true },
    format: { type: String, trim: true, maxlength: 20 },
    name: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      maxlength: [200, "File name must be at most 200 characters"],
    },
    bytes: { type: Number, min: 0, required: true },
    width: Number,
    height: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Project name must be at least 2 characters"],
      maxlength: [100, "Project name must be at most 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [2000, "Description must be at most 2000 characters"],
    },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "Not Started",
    },
    priority: {
      type: String,
      enum: PROJECT_PRIORITIES,
      default: "Medium",
    },
    dueDate: {
      type: Date,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "A client is required"],
      index: true,
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
      validate: {
        validator: (list) => list.length <= MAX_ATTACHMENTS,
        message: `A project can have at most ${MAX_ATTACHMENTS} attachments`,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Project", ProjectSchema);
