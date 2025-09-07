// Browser-friendly global module (works over file://). Attaches to window.computeMixModule.
(function(root){
// Derived from the user's TypeScript proposal. Plain JS module export.

const DENSITY = {
  water: 0.998,
  ethanol: 0.789,
  glycerin: 1.261,
  sugarDry: 1.59,
};

const BRIX_TABLE = [
  [10, 1.040],
  [20, 1.083],
  [30, 1.133],
  [40, 1.189],
  [50, 1.252],
  [60, 1.319],
];

function interpBrixDensity(bx) {
  const t = BRIX_TABLE;
  if (bx <= t[0][0]) return t[0][1];
  if (bx >= t[t.length - 1][0]) return t[t.length - 1][1];
  for (let i = 0; i < t.length - 1; i++) {
    const [x1, y1] = t[i];
    const [x2, y2] = t[i + 1];
    if (bx >= x1 && bx <= x2) {
      const r = (bx - x1) / (x2 - x1);
      return y1 + r * (y2 - y1);
    }
  }
  return 1.1;
}

function computeMix(items, opts = {}) {
  let totalMass = 0;
  let totalVol = 0;
  let sugarMass = 0;
  let ethanolMass = 0;

  const rows = [];

  for (const it of items) {
    let density = it && it.density != null ? it.density : undefined;
    let mass = 0, vol = 0;

    if (it.type === 'water') {
      density = density ?? DENSITY.water;
      mass = it.inputUnit === 'g' ? it.amount : it.amount * density;
      vol  = it.inputUnit === 'mL' ? it.amount : it.amount / density;
    } else if (it.type === 'spirit') {
      const approx = 0.998 - 0.0026 * (it.abvPct ?? 0);
      density = density ?? Math.max(0.79, approx);
      mass = it.inputUnit === 'g' ? it.amount : it.amount * density;
      vol  = it.inputUnit === 'mL' ? it.amount : it.amount / density;
      const ethMass = mass * (it.abvPct / 100) * (DENSITY.ethanol / density);
      ethanolMass += ethMass;
    } else if (it.type === 'sugar_dry') {
      mass = it.inputUnit === 'g' ? it.amount : it.amount * (it.densityForVolume ?? DENSITY.sugarDry);
      if (!opts.ignoreSugarSolidVolume) {
        const rho = (it.densityForVolume ?? DENSITY.sugarDry);
        vol = it.inputUnit === 'mL' ? it.amount : it.amount / rho;
      } else {
        vol = (it.inputUnit === 'mL') ? it.amount : 0;
      }
      sugarMass += mass;
    } else if (it.type === 'syrup') {
      const rho = density ?? interpBrixDensity(it.brix);
      mass = it.inputUnit === 'g' ? it.amount : it.amount * rho;
      vol  = it.inputUnit === 'mL' ? it.amount : it.amount / rho;
      const sugarInSyrup = mass * (it.brix / 100);
      sugarMass += sugarInSyrup;
      } else if (it.type === 'glycerin') {
        density = density ?? DENSITY.glycerin;
        const purity = (it.purityPct ?? 100) / 100;
        mass = it.inputUnit === 'g' ? it.amount : it.amount * density;
        vol  = it.inputUnit === 'mL' ? it.amount : it.amount / density;
        // if needed: mass *= purity;
      } else if (it.type === 'fruit') {
        // 과일/과일주스: 기본 밀도 1.05, 당도 10-15°Bx 가정
        density = density ?? 1.05;
        mass = it.inputUnit === 'g' ? it.amount : it.amount * density;
        vol  = it.inputUnit === 'mL' ? it.amount : it.amount / density;
        const sugarInFruit = mass * (it.brix / 100);
        sugarMass += sugarInFruit;
      } else if (it.type === 'herb') {
        // 마른 약재: 체적 무시, 질량만 사용 (밀도 0.3-0.8 가정)
        density = density ?? 0.5;
        mass = it.inputUnit === 'g' ? it.amount : it.amount * density;
        vol = 0; // 마른 약재는 체적에 포함하지 않음
      } else { // other
      density = it.density;
      mass = it.inputUnit === 'g' ? it.amount : it.amount * density;
      vol  = it.inputUnit === 'mL' ? it.amount : it.amount / density;
      if (it.sugarFrac) sugarMass += mass * it.sugarFrac;
      if (it.ethanolFrac) ethanolMass += mass * it.ethanolFrac;
    }

    totalMass += mass;
    totalVol  += vol;
    rows.push({ name: it.name, mass_g: mass, vol_mL: vol });
  }

  const ethanolVol = ethanolMass / DENSITY.ethanol;
  const abv = (totalVol > 0) ? (100 * ethanolVol / totalVol) : 0;
  const trueBx = (totalMass > 0) ? (100 * sugarMass / totalMass) : 0;

  let apparentBx;
  if (opts.apparentBx) {
    const w_gly = (items
      .filter(i => i.type === 'glycerin')
      .reduce((acc, g) => {
        const rho = g.density ?? DENSITY.glycerin;
        const m = g.inputUnit === 'g' ? g.amount : g.amount * rho;
        return acc + m;
      }, 0) / (totalMass || 1));

    const w_eth = ethanolMass / (totalMass || 1);
    const aG = opts.apparentBx.aGly ?? 0;
    const aE = opts.apparentBx.aEth ?? 0;
    apparentBx = trueBx + aG * (w_gly * 100) + aE * (w_eth * 100);
  }

  return {
    totalMass_g: totalMass,
    totalVol_mL: totalVol,
    ethanolMass_g: ethanolMass,
    ethanolVol_mL: ethanolVol,
    abvPct: abv,
    trueBx,
    apparentBx,
    breakdown: rows,
  };
}

root.computeMixModule = { DENSITY, BRIX_TABLE, interpBrixDensity, computeMix };
})(typeof window !== 'undefined' ? window : this);


