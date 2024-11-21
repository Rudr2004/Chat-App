// Login function to set the session cookie
async function login(request, response) {
  try {
    const token = "your_generated_token"; // Replace with your token generation logic
    const cookieOptions = {
      httpOnly: true, // Helps mitigate XSS attacks
      secure: process.env.NODE_ENV === "production", // Only set to true in production
      maxAge: 3600000, // 1 hour in milliseconds
    };

    return response.cookie("token", token, cookieOptions).status(200).json({
      message: "login successful",
      success: true,
    });
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
}

// Logout function to clear the session cookie
async function logout(request, response) {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Match the login cookie settings
      expires: new Date(0), // Expire the cookie immediately
    };

    return response.cookie("token", "", cookieOptions).status(200).json({
      message: "session out",
      success: true,
    });
  } catch (error) {
    return response.status(500).json({
      message: error.message || error,
      error: true,
    });
  }
}

module.exports = { login, logout };
