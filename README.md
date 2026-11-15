# Field Shift

A climate-smart crop advisor for farmers. Choose your area and get clear advice: how the climate changed over the last 30 years, which crops fit best today, and when to sow.

**Live demo:** _add your GitHub Pages link here_

## How it works

1. The farmer chooses an area (or enters coordinates).
2. The page downloads 30 years of monthly climate data from the [NASA POWER](https://power.larc.nasa.gov/) API (temperature, rainfall).
3. For each crop, a growing-season model scores (0-100) how well the rain and temperature of its season match its needs, for the first 5 seasons and the last 5 seasons.
4. The app shows the climate change, plain-language advice (crops losing suitability, extra irrigation needed, better sowing month) and a report card for every crop.

It is a static web app: HTML, CSS and plain JavaScript. No server, no build step, no dependencies.

## Run it

Open `index.html` in a browser. To serve it locally:

```
python -m http.server 8000
```

then visit http://localhost:8000.

## Project structure

```
index.html      page and screens
css/style.css   styles
js/crops.js     areas and crop needs
js/model.js     NASA download, scoring, sowing dates, advice
js/app.js       screens and rendering
```

## Limitations

- Crop needs in `js/crops.js` are approximate values from general agronomy. Check them against [FAO EcoCrop](https://ecocrop.apps.fao.org/) before relying on them.
- The model uses monthly climate averages. It does not consider soil, frost, pests, prices or local practice.
- This tool supports decisions and does not replace local agricultural advice.

## Contributing

Ideas welcome: better crop data, more areas, translations, charts. Open an issue or a pull request.

## License

MIT. See `LICENSE`. Climate data: NASA POWER, publicly available.
