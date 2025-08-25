import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./index.css";

const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
const response = await axios.get(
  https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric
);

const dayShort = (d) => new Date(d).toLocaleDateString(undefined,{weekday:"short"});

function buildDaily(list){
  const map = new Map();
  list.forEach(item=>{
    const date = item.dt_txt.split(" ")[0];
    if(!map.has(date)) map.set(date, []);
    map.get(date).push(item);
  });
  const days = [...map.entries()]
    .sort((a,b)=> new Date(a[0]) - new Date(b[0]))
    .map(([date, items])=>{
      const min = Math.min(...items.map(i=>i.main.temp_min));
      const max = Math.max(...items.map(i=>i.main.temp_max));
      let best = items[0];
      items.forEach(i=>{
        if(Math.abs(new Date(i.dt_txt).getHours() - 12) < Math.abs(new Date(best.dt_txt).getHours() - 12)){
          best = i;
        }
      });
      return { date, min: Math.round(min), max: Math.round(max), icon: best.weather[0].icon, desc: best.weather[0].main };
    });
  return days.slice(0,5);
}

const countryName = (code)=>{
  try{
    return new Intl.DisplayNames([navigator.language || "en"],{type:"region"}).of(code) || code;
  }catch{ return code }
};

export default function App(){
  const [query, setQuery] = useState("");
  const [units, setUnits] = useState("metric"); // "metric" or "imperial"
  const [now, setNow] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastCity, setLastCity] = useState("");

  const unitSymbol = units === "metric" ? "°C" : "°F";
  const windUnit = units === "metric" ? "m/s" : "mph";

  const dateLabel = useMemo(()=>{
    return new Date().toLocaleDateString(undefined, {weekday:"long", year:"numeric", month:"long", day:"numeric"});
  },[]);

  async function fetchWeather(city, unit){
    if(!API_KEY){ setErrorMsg("Missing OpenWeather API key in .env.local"); return; }
    if(!city) return;
    setLoading(true); setErrorMsg("");
    try{
      const [w, f] = await Promise.all([
        axios.get("https://api.openweathermap.org/data/2.5/weather", { params:{ q: city, units: unit, appid: API_KEY }}),
        axios.get("https://api.openweathermap.org/data/2.5/forecast", { params:{ q: city, units: unit, appid: API_KEY }})
      ]);
      setNow(w.data);
      setDays(buildDaily(f.data.list));
      setLastCity(city);
    }catch{
      setNow(null); setDays([]);
      setErrorMsg("City not found. Try another name.");
    }finally{ setLoading(false); }
  }

  function onSubmit(e){ e.preventDefault(); fetchWeather(query.trim(), units); }

  // when toggling °C/°F, refetch for the last searched city
  useEffect(()=>{
    if(lastCity) fetchWeather(lastCity, units);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[units]);

  const cityTitle = now ? `${now.name}, ${countryName(now.sys?.country || "")}` : "";
  const tempRounded = now ? Math.round(now.main.temp) : null;
  const iconUrl = now ? `https://openweathermap.org/img/wn/${now.weather?.[0]?.icon}@2x.png` : "";
  const desc = now?.weather?.[0]?.description ?? "";

  return (
    <div className="container">
      <form className="search-row" onSubmit={onSubmit}>
        <input
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          placeholder="enter city name"
          aria-label="city name"
        />
        <button className="search-btn" type="submit" title="Search">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 21l-4.2-4.2m1.4-5.3a7 7 0 11-14 0 7 7 0 0114 0z" stroke="black" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </form>

      {now && (
        <>
          <div className="title">{cityTitle}</div>
          <div className="subdued">{dateLabel}</div>

          <div className="center">
            <img className="icon-64" src={iconUrl} alt={desc || "weather"} />
            <div className="temp-row">
              <div className="big-temp">{tempRounded}{unitSymbol}</div>
              <div
                className="unit-toggle"
                onClick={()=> setUnits(prev => prev === "metric" ? "imperial" : "metric")}
                title="Toggle °C/°F"
              >
                <span className={units==="metric" ? "active" : ""}>°C</span> | <span className={units==="imperial" ? "active" : ""}>°F</span>
              </div>
            </div>
          </div>

          <div className="desc">{desc}</div>

          <div className="metrics">
            <div className="metric" title="Wind speed">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h11a3 3 0 100-6 3 3 0 00-3 3" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round"/></svg>
              <div><div className="label">Wind speed</div><div>{now.wind.speed.toFixed(2)} {windUnit}</div></div>
            </div>
            <div className="metric" title="Humidity">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 6.4 6 10a6 6 0 11-12 0c0-3.6 6-10 6-10z" fill="none" stroke="#000" strokeWidth="2"/></svg>
              <div><div className="label">Humidity</div><div>{now.main.humidity}%</div></div>
            </div>
          </div>

          <div className="section-title">5-Day Forecast:</div>
          <div className="forecast">
            {days.map(d=>(
              <div key={d.date} className="card">
                <div className="day">{dayShort(d.date)}</div>
                <img className="icon-64" src={`https://openweathermap.org/img/wn/${d.icon}.png`} alt={d.desc}/>
                <div className="minmax">{d.min}° / {d.max}°</div>
              </div>
            ))}
          </div>
        </>
      )}

      {!now && !loading && !errorMsg && (
        <div className="subdued" style={{marginTop:12, textAlign:"center"}}>
          Search any city to see current weather & 5-day forecast.
        </div>
      )}

      {loading && <div className="subdued" style={{textAlign:"center"}}>Loading…</div>}
      {errorMsg && <div className="subdued" style={{color:"#b91c1c", textAlign:"center"}}>{errorMsg}</div>}

      <div className="footer">
        Coded by You · Open sourced on GitHub · Hosted on Vercel
      </div>
    </div>
  );
}
