import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const baseURL = required("BETTER_AUTH_URL");
const audience = process.env.JWT_AUDIENCE ?? "agents-api";

export const auth = betterAuth({
  baseURL,
  secret: required("BETTER_AUTH_SECRET"),
  database: new Pool({
    connectionString: required("DATABASE_URL"),
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    jwt({
      jwt: {
        issuer: baseURL,
        audience,
        expirationTime: "15m",
        definePayload: ({ user }) => ({
          id: user.id,
          email: user.email,
        }),
      },
    }),
  ],
});
