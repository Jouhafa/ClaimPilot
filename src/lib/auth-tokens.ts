// Token management for password reset and email verification
// TODO: Replace with database storage when implementing Database & Cloud Storage

interface TokenRecord {
  token: string;
  userId: string;
  type: "password-reset" | "email-verification";
  expiresAt: Date;
  used: boolean;
}

const tokens: Map<string, TokenRecord> = new Map();

export async function createToken(
  userId: string,
  type: "password-reset" | "email-verification",
  expiresInHours: number = 24
): Promise<string> {
  // Generate secure random token
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const tokenRecord: TokenRecord = {
    token,
    userId,
    type,
    expiresAt,
    used: false,
  };

  tokens.set(token, tokenRecord);
  return token;
}

export async function validateToken(
  token: string,
  type: "password-reset" | "email-verification"
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const tokenRecord = tokens.get(token);

  if (!tokenRecord) {
    return { valid: false, error: "Invalid token" };
  }

  if (tokenRecord.used) {
    return { valid: false, error: "Token has already been used" };
  }

  if (tokenRecord.type !== type) {
    return { valid: false, error: "Invalid token type" };
  }

  if (new Date() > tokenRecord.expiresAt) {
    tokens.delete(token);
    return { valid: false, error: "Token has expired" };
  }

  return { valid: true, userId: tokenRecord.userId };
}

export async function markTokenAsUsed(token: string): Promise<void> {
  const tokenRecord = tokens.get(token);
  if (tokenRecord) {
    tokenRecord.used = true;
    tokens.set(token, tokenRecord);
  }
}

export async function deleteToken(token: string): Promise<void> {
  tokens.delete(token);
}

