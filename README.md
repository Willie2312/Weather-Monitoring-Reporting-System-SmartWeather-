\# 🌦️ SmartWeather — Weather Monitoring \& Reporting System



SmartWeather is a web-based weather monitoring and reporting system designed to provide users with accessible weather information through dedicated dashboards and weather-related services.



The system integrates the \*\*OpenWeather API\*\* for real-time weather information and uses a backend powered by \*\*Node.js, Express, MongoDB, and Mongoose\*\*.



\## ✨ Features



\### 👨‍💼 Administrator



\* Administrative dashboard

\* Manage system users

\* Manage weather logs and reports

\* Manage farming advice

\* Manage general user advice

\* Review user feedback

\* Access accuracy reports

\* Manage system settings



\### 👨‍🌾 Farmer



\* Farmer-focused weather dashboard

\* View weather information for selected locations

\* Access farming-related weather advice

\* View helpful information for weather-dependent activities



\### 👤 General User



\* View current weather information

\* Search for weather by location

\* Access weather forecasts

\* Receive general weather-related advice

\* Submit feedback



\## 🌍 Weather Information



SmartWeather uses the \*\*OpenWeather API\*\* to retrieve weather information, including:



\* Current weather conditions

\* Temperature

\* Humidity

\* Wind information

\* Weather descriptions

\* Location-based forecasts

\* Geographic coordinates



The application uses a secure backend proxy so that the OpenWeather API key is \*\*not exposed in client-side JavaScript\*\*.



\## 🛠️ Technologies Used



\### Frontend



\* HTML5

\* CSS3

\* JavaScript



\### Backend



\* Node.js

\* Express.js



\### Database



\* MongoDB

\* Mongoose



\### APIs \& Libraries



\* OpenWeather API

\* bcryptjs

\* CORS

\* dotenv



\## 📁 Project Structure



```text

Weather-Monitoring-Reporting-System-SmartWeather/

│

├── Backend/

├── images/

│

├── server.js

├── weather-api.js

│

├── HomePage.html

├── Login.html

├── SignIn.html

│

├── AdminDashboard.html

├── FarmerDashboard.html

├── GeneralUserDashboard.html

│

├── package.json

├── package-lock.json

│

├── .env.example

├── .gitignore

└── README.md

```



\## ⚙️ Installation \& Setup



\### 1. Clone the repository



```bash

git clone https://github.com/Willie2312/Weather-Monitoring-Reporting-System-SmartWeather-.git

```



\### 2. Navigate into the project



```bash

cd Weather-Monitoring-Reporting-System-SmartWeather-

```



\### 3. Install dependencies



```bash

npm install

```



\### 4. Create your environment file



Create a `.env` file in the project root directory.



Use `.env.example` as a guide:



```env

MONGO\_URI=

ADMIN\_EMAIL=

ADMIN\_PASSWORD=

OPENWEATHER\_API\_KEY=

```



Add your own configuration values to the `.env` file.



\*\*Never commit the `.env` file to GitHub.\*\*



\### 5. Start the application



```bash

npm start

```



The application will start using the server configuration defined in `server.js`.



\## 🔐 Security



Sensitive configuration values are stored using environment variables rather than being hardcoded into the source code.



The repository intentionally excludes:



\* `.env`

\* `node\_modules/`

\* Private configuration JSON files

\* Runtime files



The included `.env.example` file contains only variable names and does not contain real credentials.



\## 📊 System Users



SmartWeather provides different functionality depending on the type of user:



| User Type     | Main Functionality                                           |

| ------------- | ------------------------------------------------------------ |

| Administrator | System management, users, reports, logs, advice and feedback |

| Farmer        | Weather information and farming-related advice               |

| General User  | Weather information, forecasts and general weather services  |



\## 🚀 Future Improvements



Possible future improvements include:



\* Improved weather-data visualization

\* More detailed weather analytics

\* Automated weather alerts

\* SMS or notification-based weather alerts

\* Improved mobile responsiveness

\* Expanded agricultural recommendations

\* Enhanced reporting and analytics

\* Additional weather data sources



\## 👨‍💻 Project



\*\*SmartWeather — Weather Monitoring \& Reporting System\*\*



Developed as an academic software project with a focus on web development, weather data integration, database management, and role-based user functionality.



\## 📄 License

This repository is publicly available for viewing and portfolio evaluation. No license is granted for copying, modifying, redistributing, or commercial use of the source code without permission from the copyright holder.





