// Areas and crop needs. Values are approximate: verify with FAO EcoCrop / GAEZ.
const REGIONS = [
  { id: "khenifra", name: "Khenifra", sub: "Middle Atlas", lat: 32.93, lon: -5.67 },
  { id: "tadla", name: "Tadla", sub: "Beni Mellal", lat: 32.34, lon: -6.36 },
  { id: "marrakech", name: "Marrakech", sub: "Marrakech-Safi", lat: 31.63, lon: -8.00 },
  { id: "souss", name: "Souss", sub: "Agadir", lat: 30.43, lon: -9.60 },
  { id: "oriental", name: "Oriental", sub: "Oujda", lat: 34.68, lon: -1.91 },
  { id: "custom", name: "Another place", sub: "Enter coordinates" },
];
// c(name, season [first,last month], sowing months or null, rain optimal, rain limit, temp optimal, temp limit, tmax ok, tmax limit)
const c = (name, season, sow, r, ra, t, ta, tx, txa) => ({ name, season, sow, r, ra, t, ta, tx, txa });
const CROPS = [
  c("Wheat", [11, 5], [10, 11, 12], [300, 500], [180, 700], [9, 16], [4, 22], 24, 32),
  c("Barley", [11, 4], [10, 11, 12], [200, 400], [120, 600], [8, 16], [3, 22], 23, 31),
  c("Chickpea", [2, 6], [1, 2, 3], [200, 350], [120, 550], [12, 22], [7, 28], 28, 36),
  c("Olive", [3, 10], null, [250, 500], [120, 800], [16, 24], [10, 30], 32, 40),
  c("Almond", [2, 9], null, [250, 450], [150, 700], [14, 24], [9, 29], 32, 38),
  c("Carob", [3, 10], null, [150, 400], [80, 700], [16, 26], [10, 32], 34, 42),
  c("Prickly pear", [3, 10], null, [100, 300], [50, 600], [16, 28], [9, 35], 36, 44),
  c("Sorghum", [5, 9], [4, 5, 6], [250, 500], [130, 800], [22, 30], [15, 35], 36, 42),
  c("Maize", [5, 9], [4, 5, 6], [350, 600], [250, 900], [20, 28], [14, 33], 32, 38),
];
