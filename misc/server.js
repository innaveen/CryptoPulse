const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const prices = {};

// WebSocket Setup for Binance
const binanceSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
binanceSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    prices['Binance'] = parseFloat(data.p);
};

// WebSocket Setup for Kraken
const krakenSocket = new WebSocket('wss://ws.kraken.com/');
krakenSocket.onopen = () => {
    krakenSocket.send(
        JSON.stringify({
            event: 'subscribe',
            pair: ['XBT/USD'],
            subscription: { name: 'trade' },
        })
    );
};
krakenSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (Array.isArray(data) && data[1]) {
        prices['Kraken'] = parseFloat(data[1][0][0]);
    }
};

// WebSocket Setup for Bitfinex
const bitfinexSocket = new WebSocket('wss://api-pub.bitfinex.com/ws/2');
bitfinexSocket.onopen = () => {
    bitfinexSocket.send(
        JSON.stringify({
            event: 'subscribe',
            channel: 'ticker',
            symbol: 'tBTCUSD',
        })
    );
};
bitfinexSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (Array.isArray(data) && data.length > 6) {
        prices['Bitfinex'] = parseFloat(data[6]);
    }
};

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
            if (name === 'Coinbase') price = parseFloat(response.data.data.amount);
            if (name === 'Bitstamp') price = parseFloat(response.data.last);
            if (name === 'CoinGecko') price = parseFloat(response.data.bitcoin.usd);
            if (name === 'CoinPaprika') price = parseFloat(response.data.quotes.USD.price);
            if (name === 'CryptoCom') price = parseFloat(response.data.result.data.b);
            if (name === 'KuCoin') price = parseFloat(response.data.data.price);
            if (name === 'OKX') price = parseFloat(response.data.data[0].last);
            if (name === 'Huobi') price = parseFloat(response.data.tick.close);
            if (name === 'Bybit') price = parseFloat(response.data.result[0].last_price);
            if (name === 'Gateio') price = parseFloat(response.data[0].last);
            if (name === 'Poloniex') price = parseFloat(response.data.USDT_BTC.last);
            if (name === 'Gemini') price = parseFloat(response.data.last);

            if (price !== null) prices[name] = price;
        } catch (error) {
            console.error(`Error fetching data from ${name}:`, error.message);
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
