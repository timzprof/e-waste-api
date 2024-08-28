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
    fillPercentage: { type: Number, default: 0 },
    isActive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

BinSchema.methods.getPublicFields = function () {
  return {
    id: this._id,
    userId: this.user,
    fillPercentage: this.fillPercentage,
    sensorId: this.sensorId,
    isActive: this.isActive,
  };
};

export default model("Bin", BinSchema);
