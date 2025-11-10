import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


// ✅ Toggle subscription (subscribe or unsubscribe)
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }

    // You cannot subscribe to yourself
    if (req.user?._id.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself")
    }

    // Check if channel exists
    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    // Check if already subscribed
    const existingSub = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })

    let isSubscribed = false

    if (existingSub) {
        // ✅ Unsubscribe
        await existingSub.deleteOne()
        isSubscribed = false
    } else {
        // ✅ Subscribe
        await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId
        })
        isSubscribed = true
    }

    // Get updated subscriber count
    const subscribersCount = await Subscription.countDocuments({ channel: channelId })

    return res.status(200).json(
        new ApiResponse(
            200,
            { isSubscribed, subscribersCount },
            isSubscribed ? "Subscribed successfully" : "Unsubscribed successfully"
        )
    )
})


// ✅ Get all subscribers of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }

    // Check if channel exists
    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    const subscribers = await Subscription.find({ channel: channelId })
        .populate("subscriber", "username avatar fullName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))

    const total = await Subscription.countDocuments({ channel: channelId })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                subscribers
            },
            "Subscribers fetched successfully"
        )
    )
})


// ✅ Get list of channels a user has subscribed to
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID")
    }

    // Check if user exists
    const user = await User.findById(subscriberId)
    if (!user) {
        throw new ApiError(404, "Subscriber not found")
    }

    const subscriptions = await Subscription.find({ subscriber: subscriberId })
        .populate("channel", "username avatar fullName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))

    const total = await Subscription.countDocuments({ subscriber: subscriberId })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                channels: subscriptions
            },
            "Subscribed channels fetched successfully"
        )
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
