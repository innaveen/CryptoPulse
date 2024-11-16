// Setup variables for charts
let comparisonChart, historicalChart;

// Function to create or update comparison chart
function renderComparisonChart(data) {
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    
    const labels = Object.keys(data.CoinGecko || []).map(crypto => crypto.name || crypto.symbol);
    const datasets = [];

    // Loop through exchanges and prepare dataset
    Object.keys(data).forEach(exchange => {
        datasets.push({
            label: exchange,
            data: data[exchange].map(crypto => crypto.price || crypto.last_trade_price),
            borderColor: getRandomColor(),
            backgroundColor: 'transparent',
        });
    });

    // If the chart already exists, update it
    if (comparisonChart) {
        comparisonChart.data.labels = labels;
        comparisonChart.data.datasets = datasets;
        comparisonChart.update();
    } else {
        // Create the chart
        comparisonChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, position: 'top' },
                    title: { display: true, text: 'Live Price Comparison' },
                },
            },
        });
    }
}

// Function to create or update historical chart
function renderHistoricalChart(data, crypto) {
    const ctx = document.getElementById('historical-chart').getContext('2d');
    
    const labels = data.map(entry => new Date(entry.timestamp).toLocaleString());
    const prices = data.map(entry => entry.price);

    // If the chart already exists, update it
    if (historicalChart) {
        historicalChart.data.labels = labels;
        historicalChart.data.datasets[0].data = prices;
        historicalChart.update();
    } else {
        // Create the chart
        historicalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${crypto} Price History`,
                    data: prices,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, position: 'top' },
                    title: { display: true, text: `${crypto} Historical Data` },
                },
                scales: {
                    x: { type: 'time', time: { unit: 'minute' } },
                },
            },
        });
    }
}

// Fetch live prices and render the comparison chart
async function fetchLivePrices() {
    try {
        const response = await fetch('/api/prices');
        const data = await response.json();
        renderComparisonChart(data);
    } catch (err) {
        console.error('Error fetching live prices:', err);
    }
}

// Fetch historical data and render the historical chart
async function fetchHistoricalData(crypto) {
    try {
        const response = await fetch(`/api/historical/${crypto}`);
        const data = await response.json();
        renderHistoricalChart(data, crypto);
    } catch (err) {
        console.error(`Error fetching historical data for ${crypto}:`, err);
    }
}

// Fetch price prediction
async function predictPrice(crypto) {
    try {
        const response = await fetch(`/api/predict/${crypto}`);
        const data = await response.json();
        alert(`${crypto} Prediction: ${data.prediction}`);
    } catch (err) {
        console.error(`Error predicting price for ${crypto}:`, err);
    }
}

// Utility function to get random colors for the datasets
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Add event listeners for buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('button#fetch-live').addEventListener('click', fetchLivePrices);
    document.querySelector('button#fetch-historical').addEventListener('click', () => {
        const crypto = prompt('Enter the cryptocurrency symbol (e.g., BTC, ETH):');
        fetchHistoricalData(crypto);
    });
    document.querySelector('button#predict-price').addEventListener('click', () => {
        const crypto = prompt('Enter the cryptocurrency symbol (e.g., BTC, ETH):');
        predictPrice(crypto);
    });

    // Fetch initial live prices
    fetchLivePrices();
});
