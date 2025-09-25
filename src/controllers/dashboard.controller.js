import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized: User not found");
  }
  const channelId = req.user._id;

  // Total videos uploaded by the channel
  const totalVideos = await Video.countDocuments({ owner: channelId });

  // Total subscribers
  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  // Total video views and likes
  const videos = await Video.find({ owner: channelId }, "_id views");
  const videoIds = videos.map((v) => v._id);

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);

  const totalLikes = await Like.countDocuments({ video: { $in: videoIds } });

  return res.json(
    new ApiResponse(
      200,
      {
        totalVideos,
        totalSubscribers,
        totalViews,
        totalLikes,
      },
      "Channel stats fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  const videos = await Video.find({ owner: channelId }).sort({ createdAt: -1 });

  return res.json(
    new ApiResponse(200, videos, "Channel videos fetched successfully")
  );
});

export { getChannelStats, getChannelVideos };
