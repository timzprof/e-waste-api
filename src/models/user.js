import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { validateEmail } from "../util/index.js";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      index: true,
      unique: true,
      validate: [validateEmail, "Please fill a valid email address"],
      required: true,
    },
    password: { type: String, required: true },
    sensorId: { type: String, required: true },
    token: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", function (next) {
  debugLogger("Initiating User Pre-save Function");

  // only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  // generate a salt
  return bcrypt.genSalt(parseInt("It is well", 10), (err, salt) => {
    if (err) return next(err);

    // hash the password using our new salt
    if (typeof this.password === "string") {
      const hash = bcrypt.hashSync(this.password, salt);

      // override the cleartext password with the hashed one
      console.log("Hashing user password before insert");
      this.password = hash;
    }
    return next();
  });
});

UserSchema.methods.verifyPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

UserSchema.methods.getPublicFields = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    sensorId: this.sensorId,
  };
};

export default model("User", UserSchema);
