import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Toggle subscription to a channel
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user?._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }
  if (channelId === subscriberId.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const existingSubscription = await Subscription.findOne({
    channel: channelId,
    subscriber: subscriberId,
  });

  if (existingSubscription) {
    await existingSubscription.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unsubscribed from channel"));
  } else {
    await Subscription.create({
      channel: channelId,
      subscriber: subscriberId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, {}, "Subscribed to channel"));
  }
});

// Get subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const subscribers = await Subscription.find({ channel: channelId })
    .populate("subscriber", "username fullname avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscribers: subscribers.map((s) => s.subscriber) },
        "Channel subscribers fetched successfully"
      )
    );
});

// Get channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const subscriptions = await Subscription.find({ subscriber: subscriberId })
    .populate("channel", "username fullname avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { channels: subscriptions.map((s) => s.channel) },
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
