import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new APIError(404, "Video not found");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  let isLiked = false;

  if (existingLike) {
    await existingLike.deleteOne();
    isLiked = false;
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    isLiked = true;
  }

  const totalLikes = await Like.countDocuments({ video: videoId });

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { isLiked, totalLikes },
        isLiked ? "Video liked successfully" : "Video unliked successfully"
      )
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment ID");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new APIError(404, "Comment not found");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  let isLiked = false;

  if (existingLike) {
    await existingLike.deleteOne();
    isLiked = false;
  } else {
    await Like.create({
      comment: commentId,
      likedBy: req.user?._id,
    });
    isLiked = true;
  }

  const totalLikes = await Like.countDocuments({ comment: commentId });

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { isLiked, totalLikes },
        isLiked ? "Comment liked successfully" : "Comment unliked successfully"
      )
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new APIError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new APIError(404, "Tweet not found");
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  let isLiked = false;

  if (existingLike) {
    await existingLike.deleteOne();
    isLiked = false;
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });
    isLiked = true;
  }

  const totalLikes = await Like.countDocuments({ tweet: tweetId });

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { isLiked, totalLikes },
        isLiked ? "Tweet liked successfully" : "Tweet unliked successfully"
      )
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const likes = await Like.find({
    likedBy: req.user?._id,
    video: { $exists: true },
  })
    .populate({
      path: "video",
      populate: {
        path: "owner",
        select: "username avatar fullName",
      },
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Like.countDocuments({
    likedBy: req.user?._id,
    video: { $exists: true },
  });

  const validLikes = likes.filter((like) => like.video !== null);

  return res.status(200).json(
    new APIResponse(
      200,
      {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        likes: validLikes,
      },
      "Liked videos fetched successfully"
    )
  );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
