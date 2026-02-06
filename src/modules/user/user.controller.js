// const User = require("./user.model")

// async function updateProfile(req, res) {
//   try {
//     const userId = req.user.userId
//     const { name, email, avatar } = req.body

//     const user = await User.findByIdAndUpdate(
//       userId,
//       {
//         name,
//         email,
//         avatar,
//         isProfileComplete: true
//       },
//       { new: true }
//     )

//     res.json({ success: true, user })
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message })
//   }
// }

// module.exports = {
//   updateProfile
// }

const User = require("./user.model");

async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { name, email, avatar, phone, isProfileComplete } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    const update = {
      name,
      email,
      avatar,
    };

    // Allow updating phone number (for account setup flows like setupAccount_mail)
    if (typeof phone !== "undefined") {
      update.phone = phone;
    }

    // If caller explicitly sends isProfileComplete (e.g. setupAccount_mail), honor it;
    // otherwise default to true to keep existing behavior for phone OTP flow.
    update.isProfileComplete =
      typeof isProfileComplete === "boolean" ? isProfileComplete : true;

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
    }).select("name email phone avatar isProfileComplete");

    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId).select(
      "name email phone avatar isProfileComplete address city state pincode latitude longitude fullName addressLine1 addressLine2 area block landmark"
    ).lean()

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    // Use lean() result directly (already a plain object)
    const userObject = user;

    res.json({
      success: true,
      user: userObject
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

async function updateAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { 
      address, city, state, pincode, latitude, longitude,
      fullName, addressLine1, addressLine2, area, block, landmark 
    } = req.body;

    // Log received data for debugging
    console.log('[User Controller] Received address update request:', {
      userId,
      addressLine1,
      addressLine2,
      area,
      block,
      landmark,
      city,
      state,
      pincode,
      latitude,
      longitude
    });

    // Validate required fields - need complete address for delivery
    if (!city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "City, state, and pincode are required"
      });
    }

    // Validate that we have required address fields
    if (!addressLine1 || addressLine1.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: "Address Line 1 is required"
      });
    }

    if (!addressLine2 || addressLine2.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: "Address Line 2 is required"
      });
    }

    if (!area || area.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: "Area/Locality is required"
      });
    }

    // Block and landmark are optional - no validation needed

    // Build address update object - ensure all fields are included
    // Since we validated all required fields above, we can safely trim and set them
    const addressUpdate = {
      $set: {
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        latitude: latitude || null,
        longitude: longitude || null,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        area: area.trim(),
        block: block ? block.trim() : '',
        landmark: landmark ? landmark.trim() : ''
      }
    };

    // Combine address lines for backward compatibility
    addressUpdate.$set.address = [addressLine1, addressLine2].filter(Boolean).join(', ');
    

    // Save to database using $set to ensure all fields are updated
    const user = await User.findByIdAndUpdate(
      userId,
      addressUpdate,
      { new: true, runValidators: true }
    ).select("name email phone avatar isProfileComplete address city state pincode latitude longitude fullName addressLine1 addressLine2 area block landmark").lean();

    // Verify user object exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Use lean() result directly or convert if needed
    const userObject = user;

    // Verify the update worked by querying the database directly
    const verifyUser = await User.findById(userId).select("addressLine1 addressLine2 area block landmark city state pincode").lean();
    console.log('[User Controller] Verified user from database:', verifyUser);

    // Log saved address data for debugging
    console.log('[User Controller] Address saved to database:', {
      userId: userObject._id,
      addressLine1: userObject.addressLine1,
      addressLine2: userObject.addressLine2,
      area: userObject.area,
      block: userObject.block,
      landmark: userObject.landmark,
      city: userObject.city,
      state: userObject.state,
      pincode: userObject.pincode
    });

    // Ensure all address fields are explicitly present (even if empty string)
    const responseUser = {
      ...userObject,
      // Explicitly ensure these fields are present
      addressLine1: userObject.addressLine1 || '',
      addressLine2: userObject.addressLine2 || '',
      area: userObject.area || '',
      block: userObject.block || '',
      landmark: userObject.landmark || '',
      city: userObject.city || '',
      state: userObject.state || '',
      pincode: userObject.pincode || ''
    };

    // Log the full user object being returned
    console.log('[User Controller] Address fields check:', {
      addressLine1: responseUser.addressLine1,
      addressLine2: responseUser.addressLine2,
      area: responseUser.area,
      block: responseUser.block,
      landmark: responseUser.landmark
    });

    res.json({ 
      success: true, 
      user: responseUser,
      message: "Address updated successfully"
    });
  } catch (err) {
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
}


module.exports = {
  updateProfile,
  getMe,
  updateAddress
};
