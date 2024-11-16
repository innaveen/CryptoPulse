const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const prices = {};

// Function to handle WebSocket reconnections
function createWebSocketConnection(url, setupCallback, name) {
    let socket = new WebSocket(url);

    socket.on('open', () => {
        console.log("Connected to ${name} WebSocket");
        setupCallback(socket);
    });

    socket.on('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            if (name === 'Binance') {
                prices['Binance'] = parseFloat(data.p);
            } else if (name === 'Kraken' && Array.isArray(data) && data[1]) {
                prices['Kraken'] = parseFloat(data[1][0][0]);
            } else if (name === 'Bitfinex' && Array.isArray(data) && data.length > 6) {
                prices['Bitfinex'] = parseFloat(data[6]);
            }
        } catch (error) {
            console.error("Error parsing ${name} WebSocket message:, error.message");
        }
    });

    socket.on('error', (error) => {
        console.error("${name} WebSocket error:, error.message");
    });

    socket.on('close', () => {
        console.error("${name} WebSocket disconnected. Reconnecting...");
        setTimeout(() => createWebSocketConnection(url, setupCallback, name), 5000); // Reconnect after 5 seconds
    });
}

// Binance WebSocket
createWebSocketConnection(
    'wss://stream.binance.com:9443/ws/btcusdt@trade',
    () => {},
    'Binance'
);

// Kraken WebSocket
createWebSocketConnection(
    'wss://ws.kraken.com/',
    (socket) => {
        socket.send(
            JSON.stringify({
                event: 'subscribe',
                pair: ['XBT/USD'],
                subscription: { name: 'trade' },
            })
        );
    },
    'Kraken'
);

// Bitfinex WebSocket
createWebSocketConnection(
    'wss://api-pub.bitfinex.com/ws/2',
    (socket) => {
        socket.send(
            JSON.stringify({
                event: 'subscribe',
                channel: 'ticker',
                symbol: 'tBTCUSD',
            })
        );
    },
    'Bitfinex'
);

// REST API Setup for Other Platforms
const restApis = {
    Coinbase: 'https://api.coinbase.com/v2/prices/spot?currency=USD',
    Bitstamp: 'https://www.bitstamp.net/api/v2/ticker/btcusd/',
    CoinGecko: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    CoinPaprika: 'https://api.coinpaprika.com/v1/tickers/btc-bitcoin',
    CryptoCom: 'https://api.crypto.com/v2/public/get-ticker?instrument_name=BTC_USD',
    KuCoin: 'https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=BTC-USDT',
    OKX: 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT',
    Huobi: 'https://api.huobi.pro/market/detail/merged?symbol=btcusdt',
    Bybit: 'https://api.bybit.com/v2/public/tickers?symbol=BTCUSD',
    Gateio: 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=BTC_USDT',
    Poloniex: 'https://poloniex.com/public?command=returnTicker',
    Gemini: 'https://api.gemini.com/v1/pubticker/btcusd',
};

// Fetch REST API prices every 10 seconds
setInterval(async () => {
    for (const [name, url] of Object.entries(restApis)) {
        try {
            const response = await axios.get(url);
            let price = null;
            switch (name) {
                case 'Coinbase':
                    price = parseFloat(response.data.data.amount);
                    break;
                case 'Bitstamp':
                    price = parseFloat(response.data.last);
                    break;
                case 'CoinGecko':
                    price = parseFloat(response.data.bitcoin.usd);
                    break;
                case 'CoinPaprika':
                    price = parseFloat(response.data.quotes.USD.price);
                    break;
                case 'CryptoCom':
                    price = parseFloat(response.data.result.data.b);
                    break;
                case 'KuCoin':
                    price = parseFloat(response.data.data.price);
                    break;
                case 'OKX':
                    price = parseFloat(response.data.data[0].last);
                    break;
                case 'Huobi':
                    price = parseFloat(response.data.tick.close);
                    break;
                case 'Bybit':
                    price = parseFloat(response.data.result[0].last_price);
                    break;
                case 'Gateio':
                    price = parseFloat(response.data[0].last);
                    break;
                case 'Poloniex':
                    price = parseFloat(response.data.USDT_BTC.last);
                    break;
                case 'Gemini':
                    price = parseFloat(response.data.last);
                    break;
            }
            if (price !== null) prices[name] = price;
        } catch (error) {
            console.error("Error fetching data from ${name}:, error.message");
        }
    }
}, 10000);

// Endpoint to serve prices
app.get('/prices', (req, res) => {
    const sortedPrices = Object.entries(prices)
        .filter(([_, price]) => typeof price === 'number')
        .sort((a, b) => a[1] - b[1]);
    res.json(sortedPrices);
});

const PORT = 5000;
app.listen(PORT, () => console.log("Server running on port ${PORT}"));

