import { createLogger, format, transports } from "winston";
import jwt from "jsonwebtoken";

export const validateEmail = (email) => {
  const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

export const setToken = (publicUser) => {
  return jwt.sign(
    { user: JSON.stringify(publicUser) },
    process.env.JWT_SECRET,
    {
      expiresIn: "24h",
    }
  );
};

export class APIError extends Error {
  constructor(msg, code) {
    super(msg);
    this.message = msg;
    this.code = code;
  }
}

const {
  combine,
  timestamp,
  label,
  prettyPrint,
  splat,
  simple,
  metadata,
  colorize,
} = format;

export const logger = createLogger({
  format: combine(
    label({ label: "ewaste" }),
    timestamp(),
    prettyPrint(),
    splat(),
    simple(),
    metadata(),
    colorize()
  ),
  transports: [new transports.Console()],
});

export const prettyStringify = (data) => JSON.stringify(data, null, "\t");
