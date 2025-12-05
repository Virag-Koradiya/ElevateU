// tests/isAuthenticated.middleware.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock jsonwebtoken
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn(),
  },
}));

// 2. Import AFTER mocks
const jwt = (await import("jsonwebtoken")).default;
const isAuthenticated = (await import("../middlewares/isAuthenticated.js")).default;

describe("middleware - isAuthenticated", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      cookies: {}, // default: no token
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  it("returns 401 when no token is present in cookies", async () => {
    // req.cookies.token is undefined by default

    await isAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "User not authenticated",
      success: false,
    });

    // next should NOT be called
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when jwt.verify returns falsy (invalid token)", async () => {
    req.cookies.token = "fake.token";

    jwt.verify.mockReturnValue(null); // decode is falsy

    await isAuthenticated(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("fake.token", process.env.SECRET_KEY);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid token",
      success: false,
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.id and calls next() when token is valid", async () => {
    req.cookies.token = "valid.token";

    jwt.verify.mockReturnValue({
      userId: "user123",
      role: "student",
    });

    await isAuthenticated(req, res, next);

    // jwt.verify called with correct args
    expect(jwt.verify).toHaveBeenCalledWith("valid.token", process.env.SECRET_KEY);

    // req.id should be set
    expect(req.id).toBe("user123");

    // no response should be sent
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // next should be called exactly once
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // no error
  });

  it("calls next(error) when jwt.verify throws", async () => {
    req.cookies.token = "broken.token";

    const error = new Error("Token verification failed");
    jwt.verify.mockImplementation(() => {
      throw error;
    });

    await isAuthenticated(req, res, next);

    // no response should be sent
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // error forwarded
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });
});
