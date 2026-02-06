const User = require("../user/user.model");
const sendEmail = require("../../utils/sendEmail");
const jwt = require("jsonwebtoken");

// In-memory OTP store (Use Redis for production)
const otpStore = new Map();

// Helper to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Normalize email to lowercase for consistent storage/retrieval
    const normalizedEmail = email.trim().toLowerCase();

    const otp = generateOTP();
    // Store OTP with expiry (5 minutes) - use normalized email as key
    otpStore.set(normalizedEmail, { 
      otp, 
      expires: Date.now() + 5 * 60 * 1000 
    });

    console.log(`[OTP Request] Stored OTP for ${normalizedEmail}: ${otp}`);

    const message = `Your OTP for Yeahlo Fashion login is ${otp}. Valid for 5 minutes.`;
    
    // Fancy HTML Template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login OTP</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #fffbeb; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); padding: 32px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">YEAHLO</h1>
            <p style="color: #fff7ed; margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Premium Fashion E-commerce</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1f2937; margin: 0 0 10px; font-size: 24px; font-weight: 600;">Login Verification</h2>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0;">
                Welcome back! Use the code below to complete your secure login.
              </p>
            </div>

            <!-- OTP Box -->
            <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 30px; border: 2px dashed #d1d5db;">
              <span style="display: block; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; font-weight: 600;">Your One-Time Password</span>
              <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #d97706; font-family: monospace;">${otp}</div>
            </div>

            <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-bottom: 40px;">
              This code is valid for <strong style="color: #4b5563;">5 minutes</strong>. If you didn't request this, please ignore this email.
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 30px;" />

            <!-- Advertisement / Promo Section -->
            <div style="background-color: #fff8f1; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #fed7aa;">
              <h3 style="color: #9a3412; font-size: 18px; margin: 0 0 8px;">Explore New Collections!</h3>
              <p style="color: #c2410c; font-size: 14px; margin: 0 0 16px;">Discover the latest trends and exclusive premium wear only at Yeahlo.</p>
              <a href="https://www.yeloindia.com" style="display: inline-block; background-color: #ea580c; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 50px; font-weight: 600; font-size: 14px; transition: background-color 0.2s;">Visit Yelo India &rarr;</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px;">&copy; ${new Date().getFullYear()} Yeahlo Fashion. All rights reserved.</p>
            <div style="font-size: 12px;">
              <a href="https://www.yeloindia.com" style="color: #d1d5db; text-decoration: none; margin: 0 8px;">Website</a>
              <span style="color: #4b5563;">|</span>
              <a href="#" style="color: #d1d5db; text-decoration: none; margin: 0 8px;">Support</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      email: normalizedEmail,
      subject: "Your Login OTP - Yeahlo Fashion",
      message,
      html,
    });

    res.status(200).json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    console.error("Request OTP Error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = String(otp).trim();

    console.log(`[OTP Verify] Attempting verification for ${normalizedEmail} with OTP: ${normalizedOtp}`);

    if (!process.env.JWT_SECRET) {
      console.error("[OTP Verify] JWT_SECRET not configured");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const storedData = otpStore.get(normalizedEmail);

    if (!storedData) {
      console.log(`[OTP Verify] No stored OTP found for ${normalizedEmail}`);
      console.log(`[OTP Verify] Available keys in store:`, Array.from(otpStore.keys()));
      return res.status(400).json({ success: false, message: "OTP expired or not requested" });
    }

    if (Date.now() > storedData.expires) {
      console.log(`[OTP Verify] OTP expired for ${normalizedEmail}`);
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (String(storedData.otp) !== normalizedOtp) {
      console.log(`[OTP Verify] Invalid OTP for ${normalizedEmail}. Expected: ${storedData.otp}, Got: ${normalizedOtp}`);
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    console.log(`[OTP Verify] OTP verified successfully for ${normalizedEmail}`);
    otpStore.delete(normalizedEmail);

    // Find user by email (case-insensitive)
    let user = await User.findOne({ 
      email: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    });

    if (!user) {
      console.log(`[OTP Verify] Creating new user for ${normalizedEmail}`);
      try {
        // Don't include phone field at all - let it be undefined to avoid unique index conflict
        user = await User.create({
          email: normalizedEmail,
          name: normalizedEmail.split("@")[0],
          isProfileComplete: false
          // phone is intentionally omitted - will be added later via setupAccount_mail
        });
      } catch (createError) {
        // Handle duplicate key error (E11000) - might happen if index wasn't properly sparse
        if (createError.code === 11000 && createError.message?.includes('phone')) {
          console.error(`[OTP Verify] Duplicate key error on phone field. This usually means the phone index needs to be fixed.`);
          console.error(`[OTP Verify] Run: node src/scripts/fix-phone-index.js to fix the index`);
          // Try to find user again (might have been created in parallel or exists with null phone)
          user = await User.findOne({ 
            email: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
          });
          
          if (!user) {
            // Re-throw with helpful message
            throw new Error("Database index error: Please run 'node src/scripts/fix-phone-index.js' to fix the phone index. Error: " + createError.message);
          } else {
            console.log(`[OTP Verify] Found existing user after duplicate key error`);
          }
        } else {
          throw createError;
        }
      }
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    console.log(`[OTP Verify] Login successful for ${normalizedEmail}, userId: ${user._id}`);

    res.status(200).json({
      success: true,
      token,
      user,
      isProfileComplete: user.isProfileComplete && !!user.phone
    });

  } catch (error) {
    console.error("[OTP Verify] Error details:", error);
    console.error("[OTP Verify] Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Login failed",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
