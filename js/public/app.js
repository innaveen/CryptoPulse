const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const mongoose = require("mongoose");

// MongoDB Connection (Replace with your connection string)
mongoose
  .connect("mongodb://localhost:27017/crypto_tracker", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected...");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Define a Mongoose Schema for storing historical data
const CryptoSchema = new mongoose.Schema({
  name: String,
  exchange: String,
  price: Number,
  timestamp: { type: Date, default: Date.now },
});

const Crypto = mongoose.model("Crypto", CryptoSchema);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

// API URLs for price comparison
const EXCHANGES = {
  CoinGecko: "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd",
  Binance: "https://api.binance.com/api/v3/ticker/price",
  CoinMarketCap: "", // Add your API key in headers
  Gemini: "https://api.gemini.com/v1/pricefeed",
  Kraken: "https://api.kraken.com/0/public/Ticker",
};

// Fetch data from all exchanges
const fetchDataFromExchanges = async () => {
  const results = {};

  for (const [exchange, url] of Object.entries(EXCHANGES)) {
    try {
      let response;
      if (exchange === "CoinGecko") {
        response = await axios.get(url, {
          headers: {
            "X-CMC_PRO_API_KEY":
              "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd",
          }, // Replace with your CoinMarketCap API key
        });
      } else {
        response = await axios.get(url);
      }

      if (response.data) {
        results[exchange] = response.data; // Adjust this based on the API structure
      }
    } catch (err) {
      console.error(`Error fetching data from ${exchange}:`, err.message);
    }
  }

  return results;
};

// Save historical data to MongoDB
const saveHistoricalData = async (data) => {
  for (const [exchange, prices] of Object.entries(data)) {
    for (const crypto of prices) {
      await Crypto.create({
        name: crypto.name || crypto.symbol,
        exchange,
        price: crypto.price || crypto.last_trade_price,
      });
    }
  }
};

// API Endpoint: Fetch live price comparison
app.get("/api/prices", async (req, res) => {
  const data = await fetchDataFromExchanges();
  res.json(data);
});

// API Endpoint: Fetch historical data
app.get("/api/historical/:crypto", async (req, res) => {
  const { crypto } = req.params;
  const data = await Crypto.find({ name: crypto })
    .sort({ timestamp: -1 })
    .limit(100);
  res.json(data);
});

// Price Prediction API (Mock Implementation)
app.get("/api/predict/:crypto", (req, res) => {
  const { crypto } = req.params;

  // Mock response for now, real implementation would involve ML libraries like Scikit-learn or TensorFlow
  const prediction = Math.random() > 0.5 ? "Increase" : "Decrease";
  res.json({ crypto, prediction });
});

// Real-time updates using Socket.io
io.on("connection", (socket) => {
  console.log("New client connected");

  // Periodically fetch and emit data to connected clients
  const interval = setInterval(async () => {
    const data = await fetchDataFromExchanges();
    socket.emit("crypto_update", data);
    await saveHistoricalData(data); // Save historical data
  }, 60000); // Update every 60 seconds

  socket.on("disconnect", () => {
    clearInterval(interval);
    console.log("Client disconnected");
  });
});

// Serve static frontend files
app.use(express.static("public"));

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
