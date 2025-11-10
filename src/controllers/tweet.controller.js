import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Tweet content is required");
  }

  const tweet = await Tweet.create({
    content: content.trim(),
    owner: req.user?._id,
  });

  await tweet.populate("owner", "username avatar fullName");

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});


const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const userExists = await User.findById(userId);
  if (!userExists) {
    throw new ApiError(404, "User not found");
  }

  const tweets = await Tweet.find({ owner: userId })
    .populate("owner", "username avatar fullName")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Tweet.countDocuments({ owner: userId });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { total, page: parseInt(page), limit: parseInt(limit), tweets },
        "User tweets fetched successfully"
      )
    );
});


const getAllTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const tweets = await Tweet.find()
    .populate("owner", "username avatar fullName")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Tweet.countDocuments();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { total, page: parseInt(page), limit: parseInt(limit), tweets },
        "Tweets fetched successfully"
      )
    );
});


const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "Updated content is required");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  tweet.content = content.trim();
  await tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});


const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }

  await tweet.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet, getAllTweets };
