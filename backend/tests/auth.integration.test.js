// tests/auth.integration.test.js
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";

// Make sure SECRET_KEY exists for jwt.sign / jwt.verify
process.env.SECRET_KEY = "test-secret-key";

// 1. Mock low-level dependencies used by loginUser & registerUser

jest.unstable_mockModule("../models/user.model.js", () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

// Avoid cloudinary in tests by mocking fileUpload
jest.unstable_mockModule("../utils/fileUpload.js", () => ({
  uploadProfilePhoto: jest.fn(),
  uploadResume: jest.fn(),
}));

// 2. Import AFTER mocks
const { User } = await import("../models/user.model.js");
const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../testApp.js")).default;

let consoleErrorSpy;

describe("AUTH integration - POST /api/user/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {}); // 👈 mute error logs
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore(); // 👈 restore after each test
  });

  it("returns 200, sets cookie and body on successful login", async () => {
    const fakeUserFromDb = {
      _id: "user123",
      fullname: "Test User",
      email: "test@example.com",
      phoneNumber: 1234567890,
      role: "student",
      password: "hashed-password",
      profile: { skills: ["JS"] },
    };

    // Mock DB & crypto behavior
    User.findOne.mockResolvedValue(fakeUserFromDb);
    bcrypt.compare.mockResolvedValue(true); // password matches
    jwt.sign.mockReturnValue("mock-jwt-token");

    const res = await request(app)
      .post("/api/user/login")
      .send({
        email: "test@example.com",
        password: "password123",
        role: "student",
      })
      .expect(200); // expect 200 HTTP

    // ---- Assertions ----

    // 1) loginUser should have found the user by email
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });

    // 2) bcrypt.compare should have been used
    expect(bcrypt.compare).toHaveBeenCalledWith(
      "password123",
      "hashed-password"
    );

    // 3) jwt.sign should have been called with userId + role
    expect(jwt.sign).toHaveBeenCalledTimes(1);
    const payloadArg = jwt.sign.mock.calls[0][0];
    expect(payloadArg).toEqual({
      userId: fakeUserFromDb._id.toString(),
      role: fakeUserFromDb.role,
    });

    // 4) Response body
    expect(res.body).toEqual({
      message: "Welcome back Test User",
      user: {
        _id: fakeUserFromDb._id,
        fullname: fakeUserFromDb.fullname,
        email: fakeUserFromDb.email,
        phoneNumber: fakeUserFromDb.phoneNumber,
        role: fakeUserFromDb.role,
        profile: fakeUserFromDb.profile,
      },
      success: true,
    });

    // 5) Cookie should be set
    const setCookieHeader = res.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader.length).toBeGreaterThan(0);

    const cookieStr = setCookieHeader[0];
    expect(cookieStr).toContain("token=mock-jwt-token");
  });

  it("returns 400 with error body when credentials are invalid", async () => {
    // Case: user not found
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/user/login")
      .send({
        email: "missing@example.com",
        password: "somepass",
        role: "student",
      })
      .expect(400); // error handled by errorHandler

    // 1) DB called
    expect(User.findOne).toHaveBeenCalledWith({
      email: "missing@example.com",
    });

    // 2) errorHandler format
    expect(res.body).toEqual({
      success: false,
      message: "Incorrect email, password or role.",
    });
  });
});
