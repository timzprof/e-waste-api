import jwt, { TokenExpiredError } from "jsonwebtoken";
import { APIError } from "./util/index.js";

const getTokenData = async (req) => {
  try {
    let token = req.headers.authorization;

    if (!token || typeof token !== "string") {
      throw new APIError("No Auth Token Provided", 401);
    }

    token = token.slice(7, token.length);

    // Verify Token
    const data = jwt.verify(token, process.env.JWT_SECRET);

    return JSON.parse(data.user);
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new APIError("Token expired", 401);
    }
    console.log("Token Error: ", error);
    throw new APIError("Token is not valid", 401);
  }
};

export const verifyToken = async (req, _res, next) => {
  try {
    req.user = await getTokenData(req);
    return next();
  } catch (error) {
    return next(error);
  }
};
