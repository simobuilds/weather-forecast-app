require('dotenv').config();
const express = require("express");
const path = require("path");
const deepl = require('deepl-node');
const axios = require('axios');

const app = express();

// --- 1. CONFIGURATION & STATE ---
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.WEATHER_API_KEY;
const translator = new deepl.Translator(process.env.DEEPL_AUTH_KEY);

// In-memory "Database"
let state = {
    cards: [],
    hourlyCards: [],
    searchHistory: [],
    forecastStep: 3 // Default to 3-hour steps
};

// --- 2. SERVICES (Logic Layer) ---
const WeatherService = {
    async getCurrentWeather(query) {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${API_KEY}&units=metric`;
        const { data } = await axios.get(url, { timeout: 5000 });
        return {
            name: data.name,
            data: data,
            img: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
        };
    },

  async getHourlyForecast(cityName) {
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`;
    const geoRes = await axios.get(geoUrl);
    if (!geoRes.data.length) throw new Error("City not found");
    const { lat, lon, name } = geoRes.data[0];

    let url = state.forecastStep === 1 
        ? `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts&units=metric&appid=${API_KEY}`
        : `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

    const response = await axios.get(url);
    const rawData = response.data.hourly || response.data.list;

    // Standardize mapping for the UI
    const formattedHours = rawData.map(item => ({
        dt: item.dt,
        main: { 
            temp: item.temp !== undefined ? item.temp : item.main.temp 
        },
        humidity: item.humidity !== undefined ? item.humidity : item.main.humidity,
        wind: {
            speed: item.wind_speed !== undefined ? item.wind_speed : item.wind.speed
        },
        weather: item.weather
    }));

    return {
        name: name,
        hours: state.forecastStep === 1 ? formattedHours.slice(0, 24) : formattedHours
    };
}
}
//humidity

//wind graph data page 
app.get("/visualize/:city", async (req, res) => {
    try {
        const cityName = req.params.city;
        // Fetch the 1h data (Pro)
        const forecast = await WeatherService.getHourlyForecast(cityName);
        
        res.render("visualize", { 
            city: cityName, 
            hourlyData: JSON.stringify(forecast.hours) // Pass as string for JS to parse
        });
    } catch (err) {
        res.status(500).send("Error loading visualization");
    }
});
// --- 3. MIDDLEWARE ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 4. ROUTES ---

// View Routes
app.get("/", (req, res) => {
    res.render("index", { 
        cards: state.cards, 
        history: state.searchHistory, 
        hourlyCards: state.hourlyCards,
        forecastStep: state.forecastStep
    });
});
// Route to handle switching steps
app.post("/set-step", async (req, res) => {
    state.forecastStep = parseInt(req.body.step);

    // If there are cities currently being viewed, refresh their hourly data
    if (state.cards.length > 0) {
        try {
            // Re-fetch the first city in the list as a priority
            const cityName = state.cards[0].name;
            const forecast = await WeatherService.getHourlyForecast(cityName);
            
            // Clear and update the hourly array
            state.hourlyCards = [forecast];
        } catch (err) {
            console.error("Step Update Error:", err.message);
        }
    }
    
    res.redirect("/");
});
// Action Routes
app.post("/", async (req, res) => {
    const cityName = req.body.cityName;

    try {
        // 1. Get Current Weather
        const weather = await WeatherService.getCurrentWeather(cityName);
        state.cards.unshift(weather);

        // 2. Get Hourly Data (Automatically)
        // We use the same cityName to trigger the hourly service logic
        const forecast = await WeatherService.getHourlyForecast(cityName);
        state.hourlyCards.unshift(forecast);

        // --- HOUSEKEEPING ---
        if (state.cards.length > 3) state.cards.pop();
        if (state.hourlyCards.length > 3) state.hourlyCards.pop();

        if (!state.searchHistory.includes(weather.name)) {
            state.searchHistory.unshift(weather.name);
            if (state.searchHistory.length > 5) state.searchHistory.pop();
        }

    } catch (err) {
        console.error("Search Error:", err.message);
    }
    res.redirect("/");
});
app.post("/add-hourly", async (req, res) => {
    try {
        const forecast = await WeatherService.getHourlyForecast(req.body.cityName);
        state.hourlyCards.unshift(forecast);
        if (state.hourlyCards.length > 3) state.hourlyCards.pop();
    } catch (err) {
        console.error("Hourly Error:", err.message);
    }
    res.redirect("/");
});

app.get("/clear-history", (req, res) => {
    state.cards = [];
    state.hourlyCards = [];
    state.searchHistory = [];
    res.redirect("/");
});

// API Routes (JSON)
app.post("/translate-full-page", async (req, res) => {
    try {
        const { htmlContent } = req.body;
        if (!htmlContent) return res.status(400).json({ error: "No content" });

        const result = await translator.translateText(htmlContent, null, 'lt', {
            tag_handling: 'html',
            outline_detection: true 
        });
        res.json({ translatedHtml: result.text });
    } catch (error) {
        res.status(500).json({ error: "Translation failed" });
    }
});

// --- 5. START SERVER ---
app.listen(PORT, () => console.log(`✅ Professional Weather App running on port ${PORT}`));