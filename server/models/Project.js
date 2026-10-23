import mongoose from "mongoose";

export const PROJECT_STATUSES = ["Not Started", "In Progress", "Completed"];
export const PROJECT_PRIORITIES = ["Low", "Medium", "High"];

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
  },
  { timestamps: true }
);

export default mongoose.model("Project", ProjectSchema);
