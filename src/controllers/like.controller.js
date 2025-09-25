import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Toggle like on a video
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const existingLike = await Like.findOne({
    user: userId,
    video: videoId,
    comment: null,
    tweet: null,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res.status(200).json(new ApiResponse(200, {}, "Video like removed"));
  } else {
    await Like.create({
      user: userId,
      video: videoId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, {}, "Video liked successfully"));
  }
});

// Toggle like on a comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const existingLike = await Like.findOne({
    user: userId,
    comment: commentId,
    video: null,
    tweet: null,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment like removed"));
  } else {
    await Like.create({
      user: userId,
      comment: commentId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, {}, "Comment liked successfully"));
  }
});

// Toggle like on a tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const existingLike = await Like.findOne({
    user: userId,
    tweet: tweetId,
    video: null,
    comment: null,
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res.status(200).json(new ApiResponse(200, {}, "Tweet like removed"));
  } else {
    await Like.create({
      user: userId,
      tweet: tweetId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, {}, "Tweet liked successfully"));
  }
});

// Get all liked videos for the current user
const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const likedVideos = await Like.find({
    user: userId,
    video: { $ne: null },
  })
    .populate("video")
    .sort({ createdAt: -1 });

  const videos = likedVideos.map((like) => like.video);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { videos }, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
