import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

type TokenPayload = {
  id: string;
};

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d", // adjust if needed
  });
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // extra safety
    if (!decoded?.id) return null;

    return decoded;
  } catch {
    return null;
  }
}
