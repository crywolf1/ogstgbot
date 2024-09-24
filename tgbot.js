require("dotenv").config();
const { Telegraf } = require("telegraf");
const fetch = require("node-fetch");
const WebSocket = require("ws");
const { OpenSeaStreamClient } = require("@opensea/stream-js");

// Initialize the Telegram bot with the token from BotFather
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Initialize OpenSeaStreamClient
const client = new OpenSeaStreamClient({
  token: process.env.OPENSEA_API_KEY,
  connectOptions: {
    transport: WebSocket,
  },
});

// Fetch NFTs function
const options = {
  method: "GET",
  headers: {
    accept: "application/json",
    "x-api-key": process.env.OPENSEA_API_KEY,
  },
};

const fetchNFTs = async () => {
  let allNFTs = [];
  let next = null;

  do {
    const url = next
      ? `https://api.opensea.io/api/v2/listings/collection/onchain-gaias/all?limit=50&next=${next}`
      : "https://api.opensea.io/api/v2/listings/collection/onchain-gaias/all?limit=50";

    const response = await fetch(url, options);
    const data = await response.json();
    allNFTs = allNFTs.concat(data.listings);
    next = data.next;
  } while (next);

  return allNFTs;
};

// Function to format and send NFTs to a Telegram chat
const sendNFTsToTelegram = async (ctx) => {
  try {
    ctx.reply("Fetching OGs data, please wait..."); // Let the user know fetching has started
    const nfts = await fetchNFTs();
    const filteredNFTs = nfts.filter((nft) => {
      const identifier = parseInt(
        nft.protocol_data.parameters.offer[0].identifierOrCriteria,
        10
      );
      return identifier >= 0 && identifier <= 499;
    });

    filteredNFTs.sort((a, b) => {
      const priceA =
        a.price.current.value / Math.pow(10, a.price.current.decimals);
      const priceB =
        b.price.current.value / Math.pow(10, b.price.current.decimals);
      return priceA - priceB;
    });

    let message = `Fetched ${filteredNFTs.length} NFTs:\n`;
    filteredNFTs.forEach((nft) => {
      const identifier =
        nft.protocol_data.parameters.offer[0].identifierOrCriteria;
      const price =
        nft.price.current.value / Math.pow(10, nft.price.current.decimals);
      message += `TokenID: ${identifier}, Price: ${price} ${nft.price.current.currency}\n`;
    });

    ctx.reply(message); // Send the message to the Telegram chat
  } catch (err) {
    console.error(err);
    ctx.reply("Error fetching NFTs");
  }
};

// WebSocket listener for new listings
client.onItemListed("onchain-gaias", (event) => {
  const { payload } = event;
  const { item, payment_token, base_price } = payload;

  const nftIdParts = item.nft_id.split("/");
  const nftIdThirdPart = parseInt(nftIdParts[2]);

  if (nftIdThirdPart >= 0 && nftIdThirdPart <= 499) {
    const usdPrice = payment_token.usd_price;
    const priceInEth = base_price / Math.pow(10, payment_token.decimals);
    const message = `New Listing: NFT ID (Third Part): ${nftIdThirdPart}, Price: ${priceInEth} ETH, USD Price: ${usdPrice}`;
    bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message); // Use the environment variable for chat ID
  }
});

// Function to continuously fetch and send updated NFTs
const updateNFTsPeriodically = (ctx) => {
  // Fetch and send NFTs every 5 minutes (300000 ms)
  setInterval(async () => {
    await sendNFTsToTelegram(ctx);
  }, 300000); // Adjust the interval as needed
};

// Handle /start command
bot.start((ctx) => {
  ctx.reply("Welcome! Fetching NFT data for you...");
  sendNFTsToTelegram(ctx); // Trigger the fetchNFTs function when the user types /start
  updateNFTsPeriodically(ctx); // Start periodic updates
});

// Start the bot
bot.launch();

console.log("Bot is running...");
