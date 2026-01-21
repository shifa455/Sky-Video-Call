import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
  {
    user_id: {
      type: String,
      required: true, // ensure every meeting is tied to a user
    },
    meetingCode: {
      type: String,
      required: true,
      trim: true, // remove accidental spaces
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };