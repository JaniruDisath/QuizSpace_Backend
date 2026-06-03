import ratelimit from "../src/config/upstash.js";

function getClientKey(req) {
  const userEmail =
    req.body?.userEmail ||
    req.query?.userEmail ||
    req.headers["x-user-email"];

  if (userEmail) {
    return `user:${String(userEmail).toLowerCase().trim()}`;
  }

  const forwardedFor = req.headers["x-forwarded-for"];

  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    return `ip:${ip}`;
  }

  return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
}

const rateLimiter = async (req, res, next) => {
  try {
    const clientKey = getClientKey(req);

    const { success } = await ratelimit.limit(clientKey);

    if (!success) {
      return res.status(429).json({
        message: "Too many requests, please try again later.",
      });
    }

    next();
  } catch (error) {
    console.log("Rate limit error", error);

    // For now, do not block the whole app if Upstash fails.
    // Let the request continue.
    next();
  }
};

export default rateLimiter;