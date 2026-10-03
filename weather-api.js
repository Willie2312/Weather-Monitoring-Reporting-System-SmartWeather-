/**
 * OpenWeather API integration for Smart Weather dashboards.
 * Get a free API key at https://openweathermap.org/api and set it below.
 */
(function (global) {
  'use strict';

var BASE = '/api/weather';
  (function () {
    function getApiBase() {
      try {
        var origin = (window && window.location && window.location.origin) ? window.location.origin : '';
        if (origin && /^https?:\/\//i.test(origin)) return origin;
      } catch (e) {}
      return 'http://localhost:4000';
    }
    function exitKiosk() {
      try {
        var base = getApiBase();
        fetch(base + '/api/kiosk/exit', { method: 'POST' }).catch(function(){});
      } catch (e) {}
      setTimeout(function () {
        try { window.close(); } catch (e) {}
        setTimeout(function () {
          try { var w = window.open('', '_self'); if (w) w.close(); } catch (e) {}
        }, 120);
      }, 180);
    }
    if (typeof window !== 'undefined' && window && window.addEventListener) {
      window.addEventListener('keydown', function (e) {
        var k = e.key || e.code || '';
        if (k === 'Escape' || k === 'Esc') {
          e.preventDefault();
          exitKiosk();
        }
      });
    }
  })();

 function setApiKey(key) {
  // API key is managed securely by the server.
}

function getApiKey() {
  return null;
}

function isConfigured() {
  return true;
}

  /**
   * Geocode city name to lat/lon
   */
function geocode(cityName) {
  var url = BASE + '/geocode?city=' + encodeURIComponent(cityName);
  return fetch(url).then(function (res) {
    return res.json();
  }).then(function (arr) {
    if (!arr || arr.length === 0) throw new Error('City not found');
    return {
      lat: arr[0].lat,
      lon: arr[0].lon,
      name: arr[0].name,
      country: arr[0].country || ''
    };
  });
}

  /**
   * Fetch current weather by lat/lon
   */
function getCurrentWeather(lat, lon) {
  var url = BASE + '/current?lat=' + encodeURIComponent(lat) +
    '&lon=' + encodeURIComponent(lon);

  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error('Weather fetch failed');
    return res.json();
  });
}

  /**
   * Fetch 5-day forecast (3-hour steps) by lat/lon
   */
  function getForecast(lat, lon) {
  var url = BASE + '/forecast?lat=' + encodeURIComponent(lat) +
    '&lon=' + encodeURIComponent(lon);

  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error('Forecast fetch failed');
    return res.json();
  });
}

  /**
   * Get weather for a city name (geocode then fetch current + forecast)
   * NOTE: For higher accuracy in regions like Sierra Leone with sparse stations,
   * prefer using GPS coordinates (getWeatherByCoords) whenever possible.
   */
  function getWeatherByCity(cityName) {
    return geocode(cityName).then(function (geo) {
      return Promise.all([getCurrentWeather(geo.lat, geo.lon), getForecast(geo.lat, geo.lon)]).then(function (results) {
        return {
          location: (geo.name + (geo.country ? ', ' + geo.country : '')).trim(),
          current: results[0],
          forecast: results[1],
          lat: geo.lat,
          lon: geo.lon
        };
      });
    });
  }

  /**
   * Get weather by coordinates (e.g. from geolocation)
   */
  function getWeatherByCoords(lat, lon) {
    return Promise.all([getCurrentWeather(lat, lon), getForecast(lat, lon)]).then(function (results) {
      var c = results[0];
      var location = (c.name || '') + (c.sys && c.sys.country ? ', ' + c.sys.country : '');
      return {
        location: location.trim() || lat.toFixed(2) + ', ' + lon.toFixed(2),
        current: c,
        forecast: results[1],
        lat: lat,
        lon: lon
      };
    });
  }

  /**
   * Map OpenWeather condition id to Font Awesome icon class (fa-solid fa-*)
   */
  function getWeatherIcon(id) {
    if (id == null || id === undefined) return 'fa-solid fa-cloud';
    var n = parseInt(id, 10);
    if (n >= 200 && n < 300) return 'fa-solid fa-cloud-bolt';
    if (n >= 300 && n < 400) return 'fa-solid fa-cloud-rain';
    if (n >= 500 && n < 600) return 'fa-solid fa-cloud-rain';
    if (n >= 600 && n < 700) return 'fa-solid fa-snowflake';
    if (n >= 700 && n < 800) return 'fa-solid fa-smog';
    if (n === 800) return 'fa-solid fa-sun';
    if (n === 801) return 'fa-solid fa-cloud-sun';
    if (n >= 802 && n <= 804) return 'fa-solid fa-cloud';
    return 'fa-solid fa-cloud';
  }

  /**
   * Map OpenWeather condition id to color class for weather icons (clear/sunny=yellow, thunder=dark, etc.)
   */
  function getWeatherIconColor(id) {
    if (id == null || id === undefined) return 'wicon-cloud';
    var n = parseInt(id, 10);
    if (n >= 200 && n < 300) return 'wicon-thunder';
    if (n >= 300 && n < 400) return 'wicon-rain';
    if (n >= 500 && n < 600) return 'wicon-rain';
    if (n >= 600 && n < 700) return 'wicon-snow';
    if (n >= 700 && n < 800) return 'wicon-fog';
    if (n === 800) return 'wicon-clear';
    if (n === 801) return 'wicon-sun';
    if (n >= 802 && n <= 804) return 'wicon-cloud';
    return 'wicon-cloud';
  }

  /**
   * Normalize current weather for dashboard display
   */
  function normalizeCurrent(current) {
    if (!current) return null;
    var main = current.main || {};
    var wind = current.wind || {};
    var w = (current.weather && current.weather[0]) ? current.weather[0] : {};
    var id = w.id != null ? w.id : null;
    return {
      temp: Math.round(main.temp),
      feelsLike: main.feels_like != null ? Math.round(main.feels_like) : null,
      humidity: main.humidity != null ? main.humidity + '%' : '—',
      pressure: main.pressure != null ? main.pressure + ' hPa' : '—',
      wind: wind.speed != null ? (wind.speed * 3.6).toFixed(1) + ' km/h' : '—',
      description: w.description || '—',
      main: (w.main || '').toLowerCase(),
      icon: getWeatherIcon(id),
      iconColor: getWeatherIconColor(id),
      id: id
    };
  }

  /**
   * Build daily summary array from forecast list (5 days from API)
   */
  function buildDailyForecast(forecastList) {
    if (!forecastList || !forecastList.list) return [];
    var byDay = {};
    var list = forecastList.list;
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var dateStr = item.dt_txt ? item.dt_txt.split(' ')[0] : '';
      if (!dateStr) continue;
      if (!byDay[dateStr]) {
        var first = item.weather && item.weather[0] ? item.weather[0] : {};
        byDay[dateStr] = { temps: [], desc: first.description || '', id: first.id };
      }
      if (item.main && item.main.temp != null) byDay[dateStr].temps.push(item.main.temp);
    }
    var days = [];
    var keys = Object.keys(byDay).sort();
    for (var k = 0; k < keys.length && k < 7; k++) {
      var row = byDay[keys[k]];
      var t = row.temps;
      var avg = t.length ? Math.round(t.reduce(function (a, b) { return a + b; }, 0) / t.length) : null;
      days.push({ date: keys[k], temp: avg, description: row.desc, icon: getWeatherIcon(row.id), iconColor: getWeatherIconColor(row.id) });
    }
    if (days.length > 0 && days.length < 7) {
      var last = days[days.length - 1];
      var padCount = 7 - days.length;
      for (var p = 0; p < padCount; p++) {
        days.push({ date: last.date, temp: last.temp, description: last.description, icon: last.icon, iconColor: last.iconColor });
      }
    }
    return days;
  }

  /**
   * Get hourly slots for today from forecast list (3-hour steps). Target hours in 24h: [6,9,12,18,21] for 5 slots or [6,12,18,21] for 4.
   */
  function buildHourlySlots(forecastList, targetHours) {
    if (!forecastList || !forecastList.list || !targetHours || targetHours.length === 0) return [];
    var list = forecastList.list;
    var today = new Date().toISOString().split('T')[0];
    var out = [];
    for (var h = 0; h < targetHours.length; h++) {
      var wantHour = targetHours[h];
      var best = null;
      var bestDiff = 24;
      for (var i = 0; i < list.length; i++) {
        var dt = list[i].dt_txt;
        if (!dt || dt.indexOf(today) !== 0) continue;
        var hour = parseInt(dt.split(' ')[1].split(':')[0], 10);
        var diff = Math.abs(hour - wantHour);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = list[i];
        }
      }
          if (best) {
        var temp = best.main && best.main.temp != null ? Math.round(best.main.temp) + '°C' : '—';
        var w0 = best.weather && best.weather[0] ? best.weather[0] : {};
        var desc = w0.description || '—';
        var timeStr = best.dt_txt ? best.dt_txt.split(' ')[1].substring(0, 5) : '';
        var hourLabel = formatHourLabel(wantHour);
        out.push({ hour: hourLabel, temp: temp, condition: desc, timeStr: timeStr, icon: getWeatherIcon(w0.id), iconColor: getWeatherIconColor(w0.id) });
      } else {
        out.push({ hour: formatHourLabel(wantHour), temp: '—', condition: '—', icon: 'fa-solid fa-cloud', iconColor: 'wicon-cloud' });
      }
    }
    return out;
  }

  function formatHourLabel(hour24) {
    if (hour24 === 0) return '12 AM';
    if (hour24 === 12) return '12 PM';
    if (hour24 < 12) return hour24 + ' AM';
    return (hour24 - 12) + ' PM';
  }

  /**
   * Format description for display (capitalize)
   */
  function formatDescription(s) {
    if (!s) return '—';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /**
   * Request browser notification permission
   * Returns Promise<boolean> indicating granted state
   */
  function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return Promise.resolve(false);
    }
    if (Notification.permission === 'granted') return Promise.resolve(true);
    if (Notification.permission === 'denied') return Promise.resolve(false);
    try {
      if (typeof Notification.requestPermission === 'function') {
        return Notification.requestPermission().then(function (p) { return p === 'granted'; });
      }
    } catch (e) {}
    return Promise.resolve(false);
  }

  /**
   * Send a local browser notification with mobile-optimized flags.
   * Uses vibration, sound hint, requireInteraction, and badge so it shows
   * reliably on Android/iPhone lock screens.
   * @param {string} title
   * @param {object} opts { body, icon, tag, silent, vibrate, requireInteraction }
   * @returns {boolean} true if notification was dispatched
   */
  function sendNotification(title, opts) {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      if (Notification.permission !== 'granted') return false;
      var options = opts && typeof opts === 'object' ? JSON.parse(JSON.stringify(opts)) : {};
      if (!options.icon) options.icon = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%233b82f6"/><text x="50" y="60" text-anchor="middle" font-size="40" fill="white" font-family="sans-serif">☁</text></svg>');
      if (!options.badge) options.badge = options.icon;
      if (options.vibrate == null) options.vibrate = [200, 100, 200];
      if (options.requireInteraction == null) options.requireInteraction = true;
      if (options.silent == null) options.silent = false;
      if (options.sound == null) options.sound = 'default';
      if (!options.tag) options.tag = 'smartWeather_' + Date.now();
      if (!options.renotify) options.renotify = true;
      options.data = options.data || { type: 'weatherAlert' };
      var n = new Notification(title, options);
      setTimeout(function () {
        try { n.close(); } catch (e) {}
      }, 10000);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Decide whether a notification should fire based on severity + prior state.
   * Stores last-alert cache in localStorage so we don't spam the user.
   * CRITICAL: only writes cache when caller confirms send was successful (via markAlertSent).
   * @param {string}  locationKey   Current city / lat-lon. Different locations reset the throttle.
   * @param {boolean} forceBypass   if true, ignores interval checks (e.g. for manual test)
   */
  function shouldFireAlert(notifKey, alertRole, notifOn, minIntervalMs, forceBypass, locationKey) {
    try {
      if (!notifOn && !forceBypass) return false;
      if (typeof window === 'undefined' || !window.localStorage) return !!forceBypass;
      if (forceBypass) return true;
      var interval = typeof minIntervalMs === 'number' ? minIntervalMs : 1000 * 60 * 30; // 30min default
      var locPart = locationKey ? ('_' + String(locationKey).trim().toLowerCase().replace(/[^a-z0-9]/g, '_')) : '';
      var key = 'smartWeather_lastAlert_' + (alertRole || 'general') + '_' + (notifKey || 'any') + locPart;
      var last = parseInt(localStorage.getItem(key) || '0', 10);
      var now = Date.now();
      if (last && (now - last) < interval) return false;
      return true;
    } catch (e) {
      return !!forceBypass;
    }
  }

  /**
   * Mark an alert as having been successfully sent, so throttle begins.
   * This decouples the "should we send?" check from the "write cache" step so
   * transient permission / send failures don't cause 30min of missed alerts.
   */
  function markAlertSent(notifKey, alertRole, locationKey) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      var locPart = locationKey ? ('_' + String(locationKey).trim().toLowerCase().replace(/[^a-z0-9]/g, '_')) : '';
      var key = 'smartWeather_lastAlert_' + (alertRole || 'general') + '_' + (notifKey || 'any') + locPart;
      localStorage.setItem(key, String(Date.now()));
    } catch (e) {}
  }

  /**
   * Reset throttles for a role (useful when user toggles notifications ON).
   */
  function resetAlertThrottles(alertRole) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      var prefix = 'smartWeather_lastAlert_' + (alertRole || 'general') + '_';
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) toRemove.push(k);
      }
      for (var j = 0; j < toRemove.length; j++) localStorage.removeItem(toRemove[j]);
    } catch (e) {}
  }

  /**
   * Track the currently "active" alert location so we throttle per-location.
   * When user searches a NEW place, we clear throttles from the PREVIOUS place
   * so the new location always gets fresh alert guidance.
   */
  function setActiveAlertLocation(alertRole, locationKey) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      var storageKey = 'smartWeather_activeAlertLoc_' + (alertRole || 'general');
      var prev = localStorage.getItem(storageKey) || '';
      var next = locationKey ? String(locationKey).trim().toLowerCase().replace(/[^a-z0-9]/g, '_') : '';
      if (prev && prev !== next) {
        var prefix = 'smartWeather_lastAlert_' + (alertRole || 'general') + '_';
        var suffix = '_' + prev;
        var toRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(prefix) === 0 && k.indexOf(suffix, k.length - suffix.length) !== -1) toRemove.push(k);
        }
        for (var j = 0; j < toRemove.length; j++) localStorage.removeItem(toRemove[j]);
      }
      localStorage.setItem(storageKey, next);
    } catch (e) {}
  }

  function getActiveAlertLocation(alertRole) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return '';
      return localStorage.getItem('smartWeather_activeAlertLoc_' + (alertRole || 'general')) || '';
    } catch (e) { return ''; }
  }

  function getAdviceData(role, cur, opts) {
    if (!role || !cur) return { text: '', severity: 'safe', conditionKey: 'safe' };
    var temp = cur.temp != null ? Number(cur.temp) : null;
    var wind = cur.wind ? parseFloat(String(cur.wind).split(' ')[0]) : null;
    var humidity = cur.humidity ? parseFloat(String(cur.humidity).replace('%', '')) : null;
    var cond = (cur.main || '').toLowerCase();
    var desc = cur.description || '';
    var text = 'Weather conditions are normal today.';
    var severity = 'safe';
    var conditionKey = 'safe';
    var isThunder = cond === 'thunderstorm' || /thunder/i.test(desc);
    var isRain = cond === 'rain' || cond === 'drizzle' || /rain|shower/i.test(desc);
    var isCloudy = cond === 'clouds' || /cloud|overcast/i.test(desc);
    var hasSignificantCloud = isCloudy || cond === 'overcast';
    var HEAT_MODERATE = 37;
    var HEAT_HIGH = 40;
    var HEAT_HIGH_CLOUDY = 43;
    var HEAT_MAIZE_STRESS = 40;

    if (role === 'general') {
      if (isThunder) {
        text = 'Thunderstorm risk. Avoid travel if possible and stay indoors.';
        severity = 'high';
        conditionKey = 'thunderstorm';
      } else if (temp != null && ((hasSignificantCloud && temp > HEAT_HIGH_CLOUDY) || (!hasSignificantCloud && temp > HEAT_HIGH))) {
        text = 'High heat detected. Stay hydrated and avoid peak sun hours.';
        severity = 'high';
        conditionKey = 'heat';
      } else if (temp != null && temp > HEAT_MODERATE && !hasSignificantCloud) {
        text = 'Warm weather today. Stay hydrated and take breaks in shade.';
        severity = 'moderate';
        conditionKey = 'heat_moderate';
      } else if (wind != null && wind > 20) {
        text = 'Damaging winds possible. Secure outdoor items and exercise caution.';
        severity = 'high';
        conditionKey = 'wind_high';
      } else if (isRain) {
        text = 'Rain expected. Carry an umbrella and drive carefully.';
        severity = 'moderate';
        conditionKey = 'rain';
      } else if (wind != null && wind > 10) {
        text = 'Strong winds today. Secure outdoor items.';
        severity = 'moderate';
        conditionKey = 'wind_moderate';
      } else if (humidity != null && humidity > 80) {
        text = 'High humidity may cause discomfort. Wear light clothing.';
        severity = 'moderate';
        conditionKey = 'humidity_high';
      }
      return { text: text, severity: severity, conditionKey: conditionKey };
    }
    if (role === 'farmer') {
      text = 'Weather conditions are favorable for farming activities.';
      severity = 'safe';
      conditionKey = 'safe';
      if (isThunder) {
        text = 'Thunderstorm risk. Delay field work and secure equipment.';
        severity = 'high';
        conditionKey = 'thunderstorm';
      } else if (isRain) {
        text = 'Rainfall expected. Avoid fertilizer application and improve drainage.';
        severity = 'moderate';
        conditionKey = 'rain';
      } else if (temp != null && ((hasSignificantCloud && temp > HEAT_HIGH_CLOUDY) || (!hasSignificantCloud && temp > HEAT_HIGH))) {
        text = 'High temperature stress. Irrigate crops early morning or evening.';
        severity = 'high';
        conditionKey = 'heat';
      } else if (temp != null && temp > HEAT_MODERATE && !hasSignificantCloud) {
        text = 'Warm temperatures today. Monitor soil moisture and plan irrigation.';
        severity = 'moderate';
        conditionKey = 'heat_moderate';
      } else if (humidity != null && humidity > 85) {
        text = 'High humidity increases fungal disease risk. Monitor crops closely.';
        severity = 'moderate';
        conditionKey = 'humidity_high';
      } else if (wind != null && wind > 12) {
        text = 'Strong winds may damage crops. Secure young plants.';
        severity = 'moderate';
        conditionKey = 'wind_moderate';
      }
      var crop = opts && typeof opts.crop === 'string' ? opts.crop.toLowerCase() : null;
      if (crop === 'rice' && humidity != null && humidity > 85) {
        text = 'High risk of rice blast disease due to humidity.';
        severity = 'high';
        conditionKey = 'rice_humidity_high';
      }
      if (crop === 'maize' && temp != null && temp > HEAT_MAIZE_STRESS) {
        text = 'Maize heat stress risk. Increase irrigation frequency.';
        severity = 'high';
        conditionKey = 'maize_heat_high';
      }
      return { text: text, severity: severity, conditionKey: conditionKey };
    }
    return { text: text, severity: severity, conditionKey: conditionKey };
  }
  function getAdvice(role, cur) {
    var d = getAdviceData(role, cur);
    return d && d.text ? d.text : '';
  }

  /**
   * Get multiple weather alerts/notifications based on role and current weather
   */
  function getNotifications(role, cur, opts) {
    var notifications = [];
    if (!role || !cur) return notifications;

    var temp = cur.temp != null ? Number(cur.temp) : null;
    var wind = cur.wind ? parseFloat(String(cur.wind).split(' ')[0]) : null;
    var humidity = cur.humidity ? parseFloat(String(cur.humidity).replace('%', '')) : null;
    var cond = (cur.main || '').toLowerCase();
    var desc = cur.description || '';

    var isThunder = cond === 'thunderstorm' || /thunder/i.test(desc);
    var isRain = cond === 'rain' || cond === 'drizzle' || /rain|shower/i.test(desc);
    var isCloudy = cond === 'clouds' || /cloud|overcast/i.test(desc);
    var hasSignificantCloud = isCloudy || cond === 'overcast';
    var HEAT_MODERATE = 37;
    var HEAT_HIGH = 40;
    var HEAT_HIGH_CLOUDY = 43;
    var HEAT_MAIZE_STRESS = 40;

    if (role === 'general') {
      if (isThunder) {
        notifications.push({ text: 'Thunderstorm risk. Avoid travel if possible and stay indoors.', severity: 'high', conditionKey: 'thunderstorm' });
      }
      if (temp != null && ((hasSignificantCloud && temp > HEAT_HIGH_CLOUDY) || (!hasSignificantCloud && temp > HEAT_HIGH))) {
        notifications.push({ text: 'High heat detected. Stay hydrated and avoid peak sun hours.', severity: 'high', conditionKey: 'heat' });
      } else if (temp != null && temp > HEAT_MODERATE && !hasSignificantCloud) {
        notifications.push({ text: 'Warm weather today. Stay hydrated and take breaks in shade.', severity: 'moderate', conditionKey: 'heat_moderate' });
      }
      if (wind != null && wind > 20) {
        notifications.push({ text: 'Damaging winds possible. Secure outdoor items and exercise caution.', severity: 'high', conditionKey: 'wind_high' });
      }
      if (isRain) {
        notifications.push({ text: 'Rain expected. Carry an umbrella and drive carefully.', severity: 'moderate', conditionKey: 'rain' });
      }
      if (wind != null && wind > 10 && wind <= 20) {
        notifications.push({ text: 'Strong winds today. Secure outdoor items.', severity: 'moderate', conditionKey: 'wind_moderate' });
      }
      if (humidity != null && humidity > 80) {
        notifications.push({ text: 'High humidity may cause discomfort. Wear light clothing.', severity: 'moderate', conditionKey: 'humidity_high' });
      }
    }

    if (role === 'farmer') {
      if (isThunder) {
        notifications.push({ text: 'Thunderstorm risk. Delay field work and secure equipment.', severity: 'high', conditionKey: 'thunderstorm' });
      }
      if (isRain) {
        notifications.push({ text: 'Rainfall expected. Avoid fertilizer application and improve drainage.', severity: 'moderate', conditionKey: 'rain' });
      }
      if (temp != null && ((hasSignificantCloud && temp > HEAT_HIGH_CLOUDY) || (!hasSignificantCloud && temp > HEAT_HIGH))) {
        notifications.push({ text: 'High temperature stress. Irrigate crops early morning or evening.', severity: 'high', conditionKey: 'heat' });
      } else if (temp != null && temp > HEAT_MODERATE && !hasSignificantCloud) {
        notifications.push({ text: 'Warm temperatures today. Monitor soil moisture and plan irrigation.', severity: 'moderate', conditionKey: 'heat_moderate' });
      }
      if (humidity != null && humidity > 85) {
        notifications.push({ text: 'High humidity increases fungal disease risk. Monitor crops closely.', severity: 'moderate', conditionKey: 'humidity_high' });
      }
      if (wind != null && wind > 12) {
        notifications.push({ text: 'Strong winds may damage crops. Secure young plants.', severity: 'moderate', conditionKey: 'wind_moderate' });
      }

      var crop = opts && typeof opts.crop === 'string' ? opts.crop.toLowerCase() : null;
      if (crop === 'rice' && humidity != null && humidity > 85) {
        notifications.push({ text: 'High risk of rice blast disease due to humidity.', severity: 'high', conditionKey: 'rice_humidity_high' });
      }
      if (crop === 'maize' && temp != null && temp > HEAT_MAIZE_STRESS) {
        notifications.push({ text: 'Maize heat stress risk. Increase irrigation frequency.', severity: 'high', conditionKey: 'maize_heat_high' });
      }
    }

    if (notifications.length === 0) {
      if (role === 'farmer') {
        notifications.push({ text: 'Weather conditions are favorable for farming activities.', severity: 'safe', conditionKey: 'safe' });
      } else {
        notifications.push({ text: 'Weather conditions are normal today.', severity: 'safe', conditionKey: 'safe' });
      }
    }

    return notifications;
  }

  global.WeatherAPI = {
    setApiKey: setApiKey,
    getApiKey: getApiKey,
    isConfigured: isConfigured,
    getWeatherByCity: getWeatherByCity,
    getWeatherByCoords: getWeatherByCoords,
    normalizeCurrent: normalizeCurrent,
    buildDailyForecast: buildDailyForecast,
    buildHourlySlots: buildHourlySlots,
    formatDescription: formatDescription,
    formatHourLabel: formatHourLabel,
    getWeatherIcon: getWeatherIcon,
    getWeatherIconColor: getWeatherIconColor,
    getAdvice: getAdvice,
    getAdviceData: getAdviceData,
    getNotifications: getNotifications,
    requestNotificationPermission: requestNotificationPermission,
    sendNotification: sendNotification,
    shouldFireAlert: shouldFireAlert,
    markAlertSent: markAlertSent,
    resetAlertThrottles: resetAlertThrottles,
    setActiveAlertLocation: setActiveAlertLocation,
    getActiveAlertLocation: getActiveAlertLocation
  };
})(typeof window !== 'undefined' ? window : this);
