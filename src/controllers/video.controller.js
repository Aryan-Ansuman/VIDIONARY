import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

// List videos with optional filters, sorting, and pagination
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
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

  const sortOrder = sortType === "asc" ? 1 : -1;

  const videos = await Video.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate("owner", "username avatar fullName");

  const total = await Video.countDocuments(filter);

  return res.status(200).json(
    new APIResponse(
      200,
      {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        videos,
      },
      "Videos fetched successfully"
    )
  );
});

// Publish a new video after uploading file and thumbnail
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new APIError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new APIError(400, "Video file is required");
  }

  if (!thumbnailLocalPath) {
    throw new APIError(400, "Thumbnail is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile?.url || !thumbnail?.url) {
    throw new APIError(500, "Failed to upload video or thumbnail");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration || 0,
    owner: req.user?._id,
  });

  return res
    .status(201)
    .json(new APIResponse(201, video, "Video published successfully"));
});

// Fetch a video by ID and increment its view count
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username avatar fullName"
  );

  if (!video) {
    throw new APIError(404, "Video not found");
  }

  video.views = (video.views || 0) + 1;

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new APIResponse(200, video, "Video fetched successfully"));
});

// Update video title, description, and optional thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video ID");
  }

  if (!title && !description && !req.files?.thumbnail?.[0]?.path) {
    throw new APIError(400, "At least one field is required to update");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new APIError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new APIError(403, "You are not authorized to update this video");
  }

  if (req.files?.thumbnail?.[0]?.path) {
    const uploadedThumb = await uploadOnCloudinary(req.files.thumbnail[0].path);

    if (uploadedThumb?.url) {
      if (video.thumbnail) {
        await deleteFromCloudinary(video.thumbnail);
      }
      video.thumbnail = uploadedThumb.url;
    }
  }

  video.title = title || video.title;
  video.description = description || video.description;

  await video.save();

  return res
    .status(200)
    .json(new APIResponse(200, video, "Video updated successfully"));
});

// Delete a video and remove its media from storage
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new APIError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new APIError(403, "You are not authorized to delete this video");
  }

  try {
    if (video.videoFile) {
      await deleteFromCloudinary(video.videoFile);
    }
    if (video.thumbnail) {
      await deleteFromCloudinary(video.thumbnail);
    }
  } catch (error) {
    console.error("Error deleting video files from Cloudinary:", error);
  }

  await video.deleteOne();

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Video deleted successfully"));
});

// Toggle the video's published/unpublished status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new APIError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new APIError(
      403,
      "You are not authorized to change the publish status of this video"
    );
  }

  video.isPublished = !video.isPublished;

  await video.save();

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        video,
        `Video is now ${video.isPublished ? "published" : "unpublished"}`
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
