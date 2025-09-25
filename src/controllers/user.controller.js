import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadResult, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefereshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    // small check for user existence
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong generating access and refresh Tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  // Email format validation
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  // Password strength validation (min 8 chars, at least 1 letter and 1 number)
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters long and contain at least one letter and one number"
    );
  }

  // Username format validation (alphanumeric, 3-20 chars)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    throw new ApiError(
      400,
      "Username must be 3-20 characters and alphanumeric (underscores allowed)"
    );
  }

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "Avatar file missing");
  // }

  // File type and size validation for avatar (example: only images, max 2MB)
  let avatar;
  const avatarFile = req.files?.avatar?.[0];
  const avatarLocalPath = avatarFile?.path;
  if (avatarFile) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(avatarFile.mimetype)) {
      throw new ApiError(
        400,
        "Avatar must be an image file (jpeg, png, jpg, webp, gif)"
      );
    }
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (avatarFile.size > maxSize) {
      throw new ApiError(400, "Avatar file size must be less than 2MB");
    }
  }
  try {
    avatar = await uploadResult(avatarLocalPath);
    console.log("Avatar uploaded", avatar);
  } catch (error) {
    console.log("Error uploading avatar", error);
    throw new ApiError(500, "Failed to upload avatar");
  }

  // File type and size validation for cover image (if provided)
  const coverImageFile = req.files?.coverImage?.[0];
  if (coverImageFile) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(coverImageFile.mimetype)) {
      throw new ApiError(
        400,
        "Cover image must be an image file (jpeg, png, jpg, webp, gif)"
      );
    }
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (coverImageFile.size > maxSize) {
      throw new ApiError(400, "Cover image file size must be less than 2MB");
    }
  }
  let coverImage;
  try {
    coverImage = await uploadResult(coverImageFile?.path);
    console.log("Cover image uploaded", coverImage);
  } catch (error) {
    console.log("Error uploading cover image", error);
    throw new ApiError(500, "Failed to upload cover image");
  }

  try {
    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong");
    }
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "user registered successfully"));
  } catch (error) {
    console.log("User creation failed", error);
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }
    throw new ApiError(500, "Something went wrong and files deleted");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  //Password check
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!loggedInUser) {
    throw new ApiError(500, "Something went wrong while fetching user data");
  }
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options) // 15 minutes
    .cookie("refreshToken", refreshToken, options) // 7 days
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "Login successful"
      )
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(40, "Invalid refresh Token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefereshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while refreshing the access token"
    );
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // Add password validation here
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password are required");
  }
  // Password strength validation (min 8 chars, at least 1 letter and 1 number)
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new ApiError(
      400,
      "New password must be at least 8 characters long and contain at least one letter and one number"
    );
  }

  const user = await User.findById(req.user?._id);

  const isPasswordvalid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordvalid) {
    throw new ApiError(401, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user details"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "Fullname and Email is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarFile = req.files?.avatar?.[0];
  if (!avatarFile) {
    throw new ApiError(400, "Avatar file is required");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "image/gif",
  ];
  if (!allowedTypes.includes(avatarFile.mimetype)) {
    throw new ApiError(
      400,
      "Avatar must be an image file (jpeg, png, jpg, webp, gif)"
    );
  }
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (avatarFile.size > maxSize) {
    throw new ApiError(400, "Avatar file size must be less than 2MB");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete old avatar from cloudinary if exists
  if (user.avatar && user.avatar.public_id) {
    try {
      await deleteFromCloudinary(user.avatar.public_id);
    } catch (err) {
      // log error but don't block update
      console.log("Failed to delete old avatar from cloudinary", err);
    }
  }

  let avatar;
  try {
    avatar = await uploadResult(avatarFile.path);
  } catch (error) {
    throw new ApiError(500, "Failed to upload new avatar");
  }

  user.avatar = avatar.url;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { avatar: avatar.url },
        "Avatar updated successfully"
      )
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageFile = req.files?.coverImage?.[0];
  if (!coverImageFile) {
    throw new ApiError(400, "Cover image file is required");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "image/gif",
  ];
  if (!allowedTypes.includes(coverImageFile.mimetype)) {
    throw new ApiError(
      400,
      "Cover image must be an image file (jpeg, png, jpg, webp, gif)"
    );
  }
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (coverImageFile.size > maxSize) {
    throw new ApiError(400, "Cover image file size must be less than 2MB");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete old cover image from cloudinary if exists
  if (user.coverImage && user.coverImage.public_id) {
    try {
      await deleteFromCloudinary(user.coverImage.public_id);
    } catch (err) {
      console.log("Failed to delete old cover image from cloudinary", err);
    }
  }

  let coverImage;
  try {
    coverImage = await uploadResult(coverImageFile.path);
  } catch (error) {
    throw new ApiError(500, "Failed to upload new cover image");
  }

  user.coverImage = coverImage.url;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { coverImage: coverImage.url },
        "Cover image updated successfully"
      )
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedChannelsCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscribe"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        subscribersCount: 1,
        subscribedChannelsCount: 1,
        isSubscribed: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel profile fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  generateAccessAndRefereshToken,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
