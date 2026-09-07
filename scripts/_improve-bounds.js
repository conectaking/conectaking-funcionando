const fs = require('fs');
const lines = fs.readFileSync('public/dashboard.js', 'utf8').split(/\n/);

for (let i = 4350; i < 5600; i++) {
  const L = lines[i];
  if (/^    \/\/ =+|^    \/\/ [A-ZÁÉÍÓÚ]|^    (async )?function |^    window\.|^    let moduleAvailability|^    async function checkAdmin|^    \/\/ FUN/.test(L)) {
    console.log(String(i + 1).padStart(5), L.trim().slice(0, 100));
  }
}
console.log('--- end region ---');
for (let i = 5600; i < Math.min(5944, lines.length); i++) {
  if (/^    \/\/ =+|^    (async )?function |^    window\.|^    try \{/.test(lines[i])) {
    console.log(String(i + 1).padStart(5), lines[i].trim().slice(0, 100));
  }
}
