require("dotenv").config();
const fetch = require("node-fetch");

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

// Function to display NFTs in the terminal
const displayNFTs = async () => {
  try {
    console.log("Fetching NFT data, please wait..."); // Inform the user
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

    console.clear(); // Clear the console for better readability
    console.log(`Fetched ${filteredNFTs.length} NFTs:`);
    filteredNFTs.forEach((nft) => {
      const identifier =
        nft.protocol_data.parameters.offer[0].identifierOrCriteria;
      const price =
        nft.price.current.value / Math.pow(10, nft.price.current.decimals);
      console.log(
        `TokenID: ${identifier}, Price: ${price} ${nft.price.current.currency}`
      );
    });
  } catch (err) {
    console.error("Error fetching NFTs:", err);
  }
};

// Fetch and display NFTs initially
displayNFTs();

// Set interval to update the list every 5 minutes (300000 ms)
setInterval(displayNFTs, 300000);
