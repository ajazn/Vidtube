import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Get all videos with optional query, sort, and pagination
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const filter = {};
  if (query) {
    filter.title = { $regex: query, $options: "i" };
  }
  if (userId && isValidObjectId(userId)) {
    filter.owner = userId;
  }

  const sort = {};
  sort[sortBy] = sortType === "asc" ? 1 : -1;

  const videos = await Video.find(filter)
    .populate("owner", "username avatar fullname")
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Video.countDocuments(filter);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos, total, page: Number(page), limit: Number(limit) },
        "Videos fetched successfully"
      )
    );
});

// Publish a new video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user?._id;
  const videoFile = req.files?.video?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (!title || typeof title !== "string" || !title.trim()) {
    throw new ApiError(400, "Video title is required");
  }
  if (!videoFile) {
    throw new ApiError(400, "Video file is required");
  }

  // Upload video to Cloudinary
  const videoUpload = await uploadOnCloudinary(videoFile.path);
  if (!videoUpload?.url) {
    throw new ApiError(500, "Failed to upload video");
  }

  // Upload thumbnail if provided
  let thumbnailUrl = "";
  if (thumbnailFile) {
    const thumbnailUpload = await uploadOnCloudinary(thumbnailFile.path);
    if (!thumbnailUpload?.url) {
      throw new ApiError(500, "Failed to upload thumbnail");
    }
    thumbnailUrl = thumbnailUpload.url;
  }

  const video = await Video.create({
    title: title.trim(),
    description: description?.trim() || "",
    videoUrl: videoUpload.url,
    thumbnail: thumbnailUrl,
    owner: userId,
    isPublished: true,
  });

  await video.populate("owner", "username avatar fullname");

  return res
    .status(201)
    .json(new ApiResponse(201, { video }, "Video published successfully"));
});

// Get video by ID
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username avatar fullname"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { video }, "Video fetched successfully"));
});

// Update video details
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const userId = req.user?._id;
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  if (title && typeof title === "string" && title.trim()) {
    video.title = title.trim();
  }
  if (description && typeof description === "string") {
    video.description = description.trim();
  }
  if (thumbnailFile) {
    const thumbnailUpload = await uploadOnCloudinary(thumbnailFile.path);
    if (!thumbnailUpload?.url) {
      throw new ApiError(500, "Failed to upload thumbnail");
    }
    video.thumbnail = thumbnailUpload.url;
  }

  await video.save();
  await video.populate("owner", "username avatar fullname");

  return res
    .status(200)
    .json(new ApiResponse(200, { video }, "Video updated successfully"));
});

// Delete a video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  await video.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// Toggle publish status of a video
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: video.isPublished },
        "Video publish status toggled"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
