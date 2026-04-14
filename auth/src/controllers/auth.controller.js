const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const redis = require("../db/redis");
const { publishToQueue } = require("../brokers/broker");

function ensureSingleDefaultAddress(user) {
  if (!user || !Array.isArray(user.addresses) || user.addresses.length === 0) {
    return false;
  }

  const defaultIndexes = [];
  user.addresses.forEach((address, idx) => {
    if (address && address.isDefault === true) defaultIndexes.push(idx);
  });

  // If none are default, promote the first one.
  if (defaultIndexes.length === 0) {
    user.addresses[0].isDefault = true;
    return true;
  }

  // If multiple are default, keep the first default and unset the rest.
  if (defaultIndexes.length > 1) {
    const keepIdx = defaultIndexes[0];
    user.addresses.forEach((address, idx) => {
      if (idx !== keepIdx) address.isDefault = false;
    });
    return true;
  }

  return false;
}

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { username, email, password, fullName, role } = req.body;
    const firstName = fullName?.firstName;
    const lastName = fullName?.lastName;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const isAlreadyExistUSer = await userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (isAlreadyExistUSer) {
      return res.status(409).json({
        message: "Username or email already exists",
      });
    }

    const genSalt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, genSalt);

    const user = await userModel.create({
      username,
      email,
      password: hashPassword,
      fullName: {
        firstName,
        lastName,
      },
      role: role || "user",
    });

    // Publish user registration event to RabbitMQ
    await Promise.all([
      publishToQueue("AUTH_NOTIFICATIONS_USER_REGISTRATION", {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      }),

      publishToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", user)
    ]);

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Login a user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const user = await userModel
      .findOne({
        $or: [{ email }, { username }],
      })
      .select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get current user info
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    message: "Current user info fetched successfully",
    user: req.user,
  });
};

/**
 * @desc    Logout user by blacklisting the token
 * @route   GET /api/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res) => {
  const token = req.cookies.token;

  if (token) {
    redis.set(`blacklist:${token}`, true, "EX", 24 * 60 * 60); // Blacklist token for 1 day
  }

  // Clear the auth cookie regardless of whether it exists.
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
  });

  return res.status(200).json({
    message: "Logout successful",
  });
};

async function getUserAddresses(req, res) {
  const id = req.user.id;

  const user = await userModel.findById(id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const didChange = ensureSingleDefaultAddress(user);
  if (didChange) {
    await user.save();
  }

  return res.status(200).json({
    message: "User addresses fetched successfully",
    addresses: user.addresses,
  });
}

/**
 * @desc    Add a new address for the current user
 * @route   POST /api/auth/users/me/addresses
 * @access  Private
 */
async function addUserAddress(req, res) {
  const id = req.user.id;
  const { street, city, state, country, pincode, isDefault } = req.body;

  const user = await userModel.findById(id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  // Normalize existing addresses so we start from a consistent state.
  ensureSingleDefaultAddress(user);

  const nextAddress = {
    street,
    city,
    state,
    country,
    pincode,
    isDefault: Boolean(isDefault),
  };

  // First address must be default.
  if (!user.addresses || user.addresses.length === 0) {
    nextAddress.isDefault = true;
  }

  // If caller wants this as default, unset all others.
  if (nextAddress.isDefault === true && Array.isArray(user.addresses)) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  user.addresses.push(nextAddress);

  // Ensure we never end up with 0 or >1 defaults.
  ensureSingleDefaultAddress(user);
  await user.save();

  return res.status(201).json({
    message: "Address added successfully",
    addresses: user.addresses,
  });
}

/**
 * @desc    Delete an address for the current user
 * @route   DELETE /api/auth/users/me/addresses/:addressId
 * @access  Private
 */
async function deleteUserAddress(req, res) {
  const id = req.user.id;
  const { addressId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    return res.status(400).json({
      message: "Invalid addressId",
    });
  }

  const user = await userModel.findById(id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const idx = (user.addresses || []).findIndex(
    (a) => String(a._id) === String(addressId),
  );
  if (idx === -1) {
    return res.status(404).json({
      message: "Address not found",
    });
  }

  const wasDefault = Boolean(user.addresses[idx].isDefault);
  user.addresses.splice(idx, 1);

  if (wasDefault && user.addresses.length > 0) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
    user.addresses[0].isDefault = true;
  }

  // Also clean up any invalid state after deletion.
  ensureSingleDefaultAddress(user);
  await user.save();

  return res.status(200).json({
    message: "Address deleted successfully",
    addresses: user.addresses,
  });
}

module.exports = {
  register,
  loginUser,
  getCurrentUser,
  logoutUser,
  getUserAddresses,
  addUserAddress,
  deleteUserAddress,
};
