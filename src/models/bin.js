import { Schema, model } from "mongoose";

const BinSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      autopopulate: true,
      default: null,
    },
    sensorId: { type: String, required: true },
    isActive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default model("Bin", BinSchema);
