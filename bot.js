import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import dotenv from "dotenv";
import fetch from "node-fetch";
import insta from "instagram-url-direct";

// Load environment variables from .env file
dotenv.config();

// Replace with your bot token from BotFather
const token = process.env.TELEGRAM_BOT_TOKEN; // Make sure you have your token in .env
const bot = new TelegramBot(token, { polling: true });
// Listen for messages containing Instagram URLs
bot.on("message", (msg) => {
    if (msg.text === "/start") {
        const chatId = msg.chat.id;
        bot.sendMessage(
            chatId,
            "Welcome! Can you send me the link of an Instagram Reel to download it?"
        );
    }
});
bot.onText(
    /https:\/\/www\.instagram\.com\/(p|reel)\/([a-zA-Z0-9_-]+)\//,
    async (msg, match) => {
        const chatId = msg.chat.id;
        const videoUrl = match[0]; // Full Instagram URL

        try {
            // Notify the user
            await bot.sendMessage(chatId, "Fetching the video, please wait...");

            // Fetch the video URL from Instagram
            const videoData = await insta(videoUrl);

            // Check if we received a valid response
            if (
                videoData &&
                videoData.url_list &&
                videoData.url_list.length > 0
            ) {
                const videoLink = videoData.url_list[0]; // Extract the first video URL from the list
                console.log("Instagram Video URL:", videoLink);

                // Download the video using the URL
                const videoResponse = await fetch(videoLink);
                const videoStream = videoResponse.body;

                if (!videoStream) {
                    await bot.sendMessage(
                        chatId,
                        "Failed to download the video."
                    );
                    return;
                }

                // Generate a unique file name for the download
                const videoFilePath = "./downloaded_instagram_video.mp4";

                const fileStream = fs.createWriteStream(videoFilePath);
                videoStream.pipe(fileStream);

                fileStream.on("finish", async () => {
                    console.log(
                        "Video downloaded! Sending video to Telegram..."
                    );

                    try {
                        // Send the video to Telegram
                        await bot.sendVideo(chatId, videoFilePath);
                        console.log("Video sent!");

                        // Delete the video file after sending to save space
                        fs.unlinkSync(videoFilePath);
                    } catch (sendError) {
                        console.error("Failed to send the video:", sendError);
                        await bot.sendMessage(
                            chatId,
                            "Failed to send the video."
                        );
                    }
                });

                videoStream.on("error", (error) => {
                    console.error("Download Error:", error);
                    bot.sendMessage(chatId, "Failed to download the video.");
                });
            } else {
                await bot.sendMessage(chatId, "Failed to retrieve video URL.");
            }
        } catch (error) {
            console.error("Error:", error);
            await bot.sendMessage(
                chatId,
                "Something went wrong. Please try again later."
            );
        }
    }
);
