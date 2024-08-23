import { createLogger, format, transports } from "winston";

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