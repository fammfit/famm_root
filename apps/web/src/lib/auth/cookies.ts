/**
 * Cookie security defaults.
 *
 * `Secure` defaults to ON for every environment except `development`, so
 * staging / preview / production-with-an-unconventional-NODE_ENV all set the
 * flag. Override with `COOKIE_INSECURE=1` only when running over plain HTTP
 * locally.
 */
export function secureCookieFlag(): boolean {
  if (process.env["COOKIE_INSECURE"] === "1") return false;
  return process.env["NODE_ENV"] !== "development";
}
