import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new APIError(400, "Invalid channel ID")
    }

    if (req.user?._id.toString() === channelId.toString()) {
        throw new APIError(400, "You cannot subscribe to yourself")
    }

    const channel = await User.findById(channelId)
    if (!channel) {
        throw new APIError(404, "Channel not found")
    }


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
        await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId
        })
        isSubscribed = true
    }

    const subscribersCount = await Subscription.countDocuments({ channel: channelId })

    return res.status(200).json(
        new APIResponse(
            200,
            { isSubscribed, subscribersCount },
            isSubscribed ? "Subscribed successfully" : "Unsubscribed successfully"
        )
    )
})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(channelId)) {
        throw new APIError(400, "Invalid channel ID")
    }

    
    const channel = await User.findById(channelId)
    if (!channel) {
        throw new APIError(404, "Channel not found")
    }

    const subscribers = await Subscription.find({ channel: channelId })
        .populate("subscriber", "username avatar fullName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))

    const total = await Subscription.countDocuments({ channel: channelId })

    return res.status(200).json(
        new APIResponse(
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

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(subscriberId)) {
        throw new APIError(400, "Invalid subscriber ID")
    }


    const user = await User.findById(subscriberId)
    if (!user) {
        throw new APIError(404, "Subscriber not found")
    }

    const subscriptions = await Subscription.find({ subscriber: subscriberId })
        .populate("channel", "username avatar fullName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))

    const total = await Subscription.countDocuments({ subscriber: subscriberId })

    return res.status(200).json(
        new APIResponse(
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
