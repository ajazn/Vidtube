import mongoose from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Get all comments for a video
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const comments = await Comment.find({ video: videoId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate("user", "username avatar");

  const totalComments = await Comment.countDocuments({ video: videoId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        total: totalComments,
        page: Number(page),
        limit: Number(limit),
      },
      "Comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const userId = req.user?._id;

  // Validate input
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  // Create comment
  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: userId,
  });

  // Populate user info for response
  await comment.populate("owner", "username avatar");

  return res
    .status(201)
    .json(new ApiResponse(201, { comment }, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user?._id;

  // Validate input
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if the user is the owner of the comment
  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  // Update the comment content
  comment.content = content.trim();
  await comment.save();

  // Populate owner info for response
  await comment.populate("owner", "username avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, { comment }, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  // Validate input
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if the user is the owner of the comment
  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  // Delete the comment
  await comment.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
