require('dotenv').config();
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// Middleware & View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Global History Array
let searchHistory = []; 

// Route: Homepage
app.get("/", function(req, res) {
  // MUST pass history: searchHistory here too, otherwise index.ejs crashes
  res.render("index", { weather: null, query: null, imgUrl: null, history: searchHistory });
});

// Route: Handle Form Submission (ONLY ONE POST ROUTE)
app.post("/", function(req, res) {
  const query = req.body.cityName;
  const apiKey = process.env.WEATHER_API_KEY; 
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${apiKey}&units=metric`;
  
  https.get(url, function(apiResponse) {
    if (apiResponse.statusCode !== 200) {
      res.render("index", { weather: "error", query: query, imgUrl: null, history: searchHistory });
      return;
    }
    
    let rawData = "";
    apiResponse.on("data", (chunk) => { rawData += chunk; });
    
    apiResponse.on("end", () => {
      try {
        const weatherData = JSON.parse(rawData);
        const icon = weatherData.weather[0].icon;
        const imgUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        
        // --- History Logic ---
        // Add to history if search was successful and not a duplicate
        if (query && !searchHistory.includes(query)) {
            searchHistory.unshift(query); 
            if (searchHistory.length > 3) searchHistory.pop();
        }
        
        res.render("index", { 
          weather: weatherData, 
          query: query, 
          imgUrl: imgUrl,
          history: searchHistory // Pass history here
        });
      } catch (error) {
        res.render("index", { weather: "error", query: query, imgUrl: null, history: searchHistory });
      }
    });
  }).on("error", () => {
    res.render("index", { weather: "error", query: query, imgUrl: null, history: searchHistory });
  });
});

// Port Logic for Local Testing
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;