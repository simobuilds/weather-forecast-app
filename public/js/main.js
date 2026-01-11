// public/js/main.js

let originalEnglishContent = ""; 

function submitHistory(cityName) {
    const input = document.getElementById('cityInput');
    const form = document.querySelector('.weather-form');
    if (input && form) {
        input.value = cityName;
        form.submit();
    }
    originalEnglishContent = null;
}

async function translateText(text, elementId) {
    const element = document.getElementById(elementId);
    const originalText = element.innerText;
    
    element.innerText = "..."; 

    try {
        const response = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        const data = await response.json();
        if (data.translatedText) {
            element.innerText = data.translatedText;
        } else {
            element.innerText = originalText;
        }
    } catch (err) {
        console.error("Translation error:", err);
        element.innerText = originalText;
    }
}

async function toggleLanguage() {
    const btn = document.getElementById('translatePageBtn');
    const container = document.querySelector('.weather-app-container');
    const currentLang = btn.getAttribute('data-current-lang');

    if (currentLang === 'en') {
        originalEnglishContent = container.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
        btn.disabled = true;

        try {
            const response = await fetch('/translate-full-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ htmlContent: originalEnglishContent })
            });

            const data = await response.json();
            
            if (data.translatedHtml) {
                container.innerHTML = data.translatedHtml;
                btn.innerHTML = '<i class="fas fa-undo"></i> Translate to English';
                btn.setAttribute('data-current-lang', 'lt');
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-info');
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        } finally {
            btn.disabled = false;
        }

    } else {
        if (originalEnglishContent !== "") {
            container.innerHTML = originalEnglishContent;
            btn.innerHTML = '<i class="fas fa-globe"></i> Translate to Lithuanian';
            btn.setAttribute('data-current-lang', 'en');
            btn.classList.remove('btn-info');
            btn.classList.add('btn-warning');
        }
    }
}
// public/js/main.js

function shareTwitter(cityName, temp) {
    const text = encodeURIComponent(`Check out the weather in ${cityName}: ${temp}°C! via @YourWeatherApp`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
}

function shareFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

async function takeSnapshot(cardId, cityName) {
    const cardElement = document.getElementById(cardId);
    
    // Check if card exists
    if (!cardElement) {
        console.error("Could not find card with ID:", cardId);
        return;
    }

    const shareSection = cardElement.querySelector('.share-buttons');

    try {
        // Only hide if it actually exists
        if (shareSection) shareSection.style.opacity = '0';

        const canvas = await html2canvas(cardElement, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
            // Ensure we don't capture the area where the scrollbar might be
            logging: false 
        });

        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = `Weather-${cityName}.png`;
        link.href = image;
        link.click();
    } catch (err) {
        console.error("Snapshot failed:", err);
    } finally {
        // Bring the buttons back
        if (shareSection) shareSection.style.opacity = '1';
    }
}
