import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;

  if (!channelId) {
    throw new ApiError(401, "Unauthorized");
  }

  const totalVideos = await Video.countDocuments({ owner: channelId });

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  const totalViewsAgg = await Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    { $group: { _id: null, totalViews: { $sum: "$views" } } },
  ]);
  const totalViews = totalViewsAgg[0]?.totalViews || 0;

  const totalLikesAgg = await Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "videoLikes",
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: { $size: "$videoLikes" } },
      },
    },
  ]);
  const totalLikes = totalLikesAgg[0]?.totalLikes || 0;

  const totalCommentsAgg = await Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "videoComments",
      },
    },
    {
      $group: {
        _id: null,
        totalComments: { $sum: { $size: "$videoComments" } },
      },
    },
  ]);
  const totalComments = totalCommentsAgg[0]?.totalComments || 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos,
        totalSubscribers,
        totalViews,
        totalLikes,
        totalComments,
        averageViewsPerVideo:
          totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0,
      },
      "Channel stats fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  if (!channelId) {
    throw new ApiError(401, "Unauthorized");
  }

  const sortOrder = sortType === "asc" ? 1 : -1;

  const videos = await Video.find({ owner: channelId })
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate("owner", "username avatar fullName");

  const total = await Video.countDocuments({ owner: channelId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        videos,
      },
      "Channel videos fetched successfully"
    )
  );
});

export { getChannelStats, getChannelVideos };
