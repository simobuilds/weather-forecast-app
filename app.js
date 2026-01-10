require('dotenv').config();
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// FIXED: Define BOTH arrays at the top so they exist when the page loads
let weatherCards = []; 
let searchHistory = []; 

app.get("/", function(req, res) {
  // Pass both to the view
  res.render("index", { 
    cards: weatherCards, 
    history: searchHistory 
  });
});

app.post("/", function(req, res) {
  const query = req.body.cityName;
  const apiKey = process.env.WEATHER_API_KEY; 
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${apiKey}&units=metric`;
  
  https.get(url, function(apiResponse) {
    let rawData = "";
    apiResponse.on("data", (chunk) => { rawData += chunk; });
    
    apiResponse.on("end", () => {
      try {
        const weatherData = JSON.parse(rawData);
        
        if (weatherData.cod === 200) {
          const icon = weatherData.weather[0].icon;
          const imgUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
          
          // 1. Update the 3 visual cards
          weatherCards.unshift({
            name: weatherData.name,
            data: weatherData, // This ensures ejs can access city.data.main.temp
            img: imgUrl
          });
          if (weatherCards.length > 3) weatherCards.pop();

          // 2. Update the text history (the badges)
          if (!searchHistory.includes(weatherData.name)) {
            searchHistory.unshift(weatherData.name);
            if (searchHistory.length > 5) searchHistory.pop();
          }
        }
        res.redirect("/");
      } catch (error) {
        res.redirect("/");
      }
    });
  }).on("error", () => {
    res.redirect("/");
  });
});

app.get("/clear-history", (req, res) => {
    weatherCards = [];
    searchHistory = []; // Clear both for a fresh start
    res.redirect("/");
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;