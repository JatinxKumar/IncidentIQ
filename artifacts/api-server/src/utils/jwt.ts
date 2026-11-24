import jwt from "jsonwebtoken";

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || "default_access_secret_do_not_use_in_prod";
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || "default_refresh_secret_do_not_use_in_prod";

// Long-lived access token (effectively never expires as requested)
const ACCESS_TOKEN_EXPIRATION = "100y";
// Long-lived refresh token (effectively never expires as requested)
const REFRESH_TOKEN_EXPIRATION = "100y";

export interface TokenPayload {
  id: string;
  role: string;
}

export function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TOKEN_EXPIRATION });
  const refreshToken = jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRATION });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, getAccessSecret()) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, getRefreshSecret()) as TokenPayload;
}
