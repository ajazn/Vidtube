import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create a new tweet
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user?._id;

  if (!content || typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Tweet content is required");
  }

  const tweet = await Tweet.create({
    content: content.trim(),
    owner: userId,
  });

  await tweet.populate("owner", "username fullname avatar");

  return res
    .status(201)
    .json(new ApiResponse(201, { tweet }, "Tweet created successfully"));
});

// Get all tweets for a user
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const tweets = await Tweet.find({ owner: userId })
    .populate("owner", "username fullname avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { tweets }, "User tweets fetched successfully"));
});

// Update a tweet
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  const userId = req.user?._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Tweet content is required");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  tweet.content = content.trim();
  await tweet.save();

  await tweet.populate("owner", "username fullname avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, { tweet }, "Tweet updated successfully"));
});

// Delete a tweet
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }

  await tweet.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
