// tests/authLogin.controller.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// 1. Mock user.service
jest.unstable_mockModule("../services/user.service.js", () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  updateUserProfile: jest.fn(),
  getUserById: jest.fn(),
}));

// 2. Import AFTER mocks
const userService = await import("../services/user.service.js");
const { login } = await import("../controllers/auth.controller.js");

describe("auth.controller - login", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        password: "password123",
        role: "student",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  it("should call loginUser and respond with 200, cookie and JSON on success", async () => {
    const mockUser = {
      _id: "user123",
      fullname: "Test User",
      email: "test@example.com",
      phoneNumber: 1234567890,
      role: "student",
      profile: {},
    };

    userService.loginUser.mockResolvedValue({
      token: "mock-jwt-token",
      user: mockUser,
    });

    await login(req, res, next);

    // 1) loginUser called with correct data
    expect(userService.loginUser).toHaveBeenCalledTimes(1);
    expect(userService.loginUser).toHaveBeenCalledWith({
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
    });

    // 2) status 200
    expect(res.status).toHaveBeenCalledWith(200);

    // 3) cookie set correctly
    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [cookieName, cookieValue, cookieOptions] = res.cookie.mock.calls[0];

    expect(cookieName).toBe("token");
    expect(cookieValue).toBe("mock-jwt-token");
    // We don't assert exact sameSite/secure since depend on NODE_ENV
    expect(cookieOptions).toEqual(
      expect.objectContaining({
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      })
    );

    // 4) JSON response
    expect(res.json).toHaveBeenCalledWith({
      message: "Welcome back Test User",
      user: mockUser,
      success: true,
    });

    // 5) next should NOT be called
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) when loginUser throws", async () => {
    const error = new Error("Invalid credentials");
    error.status = 400;

    userService.loginUser.mockRejectedValue(error);

    await login(req, res, next);

    // No response should be sent
    expect(res.status).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // Error forwarded to next
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });
});
