function safeCopyToClipboard(text, msg) {
  if (window.copyToClipboard) {
    window.copyToClipboard(text, msg);
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (window.showToast) window.showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
    }).catch(() => fallbackExecCopy(text, msg));
  } else {
    fallbackExecCopy(text, msg);
  }
}
function fallbackExecCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (window.showToast) window.showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
  } catch(e) {
    if (window.showToast) window.showToast('Kopyalama başarısız');
  }
  document.body.removeChild(ta);
}

let currentColors = [];
        let exportFormat = 'css';

        function onColorPickerChange(val) {
          document.getElementById('input-hex-text').value = val.toUpperCase();
          generatePalette();
        }

        function onHexTextChange(val) {
          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            document.getElementById('input-color-picker').value = val;
            generatePalette();
          }
        }

        function setPreset(hex, mode) {
          document.getElementById('input-color-picker').value = hex;
          document.getElementById('input-hex-text').value = hex.toUpperCase();
          document.getElementById('select-mode').value = mode;
          generatePalette();
        }

        function randomColor() {
          const letters = '0123456789ABCDEF';
          let color = '#';
          for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
          }
          setPreset(color, document.getElementById('select-mode').value);
        }

        async function generatePalette() {
          const hexRaw = document.getElementById('input-hex-text').value.replace('#', '').trim();
          const mode = document.getElementById('select-mode').value;
          const loading = document.getElementById('palette-loading');
          const container = document.getElementById('palette-container');

          loading.classList.remove('hidden');
          container.classList.add('hidden');

          try {
            const res = await fetch(`/api/renk/scheme?hex=${encodeURIComponent(hexRaw)}&mode=${encodeURIComponent(mode)}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            currentColors = data.colors || [];
            loading.classList.add('hidden');
            container.classList.remove('hidden');

            renderPalette(currentColors);
            updateContrastAnalysis(data.seedHex);
            updateCodeExport();
          } catch(err) {
            loading.innerHTML = '<span class="text-rose-500 font-medium text-sm">Renk paleti oluşturulamadı: ' + err.message + '</span>';
          }
        }

        function renderPalette(colors) {
          const container = document.getElementById('palette-container');
          container.innerHTML = colors.map((c, idx) => `
            <div class="rounded-xl bg-white border border-mistral-hairline overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
              <!-- Renk Şeridi -->
              <div 
                onclick="copyText('${c.hex}')" 
                class="h-36 sm:h-44 w-full cursor-pointer relative p-3 flex flex-col justify-between transition-transform duration-200 group-hover:scale-[1.02]" 
                style="background-color: ${c.hex}; color: ${c.contrastText};">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/20 backdrop-blur w-fit">
                  Renk #${idx + 1}
                </span>
                <span class="text-xs font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur px-2 py-1 rounded w-fit">
                  Tıkla & Kopyala
                </span>
              </div>

              <!-- Detaylar -->
              <div class="p-3.5 space-y-1.5 bg-white">
                <h4 class="font-bold text-xs font-editorial text-mistral-ink truncate" title="${c.name}">${c.name}</h4>
                <div class="flex items-center justify-between font-mono text-[11px] font-bold text-mistral-ink">
                  <span>${c.hex}</span>
                  <button onclick="copyText('${c.hex}')" class="text-mistral-orange hover:underline text-[10px]">Kopyala</button>
                </div>
                <div class="text-[10px] text-mistral-stone font-mono truncate">
                  ${c.rgb}
                </div>
              </div>
            </div>
          `).join('');
        }

        // Kontrast Oranı Hesaplama Fonksiyonu
        function getLuminance(r, g, b) {
          const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        }

        function hexToRgb(hex) {
          hex = hex.replace('#', '');
          if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
          const num = parseInt(hex, 16);
          return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
        }

        function updateContrastAnalysis(hex) {
          document.getElementById('lbl-contrast-hex').innerText = hex;
          const rgb = hexToRgb(hex);
          const bgLum = getLuminance(rgb.r, rgb.g, rgb.b);

          const whiteLum = 1.0;
          const blackLum = 0.0;

          const ratioWhite = (whiteLum + 0.05) / (bgLum + 0.05);
          const ratioBlack = (bgLum + 0.05) / (blackLum + 0.05);

          const cardW = document.getElementById('card-contrast-white');
          const cardB = document.getElementById('card-contrast-black');

          cardW.style.backgroundColor = hex;
          cardB.style.backgroundColor = hex;

          const rw = Math.max(ratioWhite, 1 / ratioWhite).toFixed(1);
          const rb = Math.max(ratioBlack, 1 / ratioBlack).toFixed(1);

          document.getElementById('ratio-white').innerText = `Oran: ${rw}:1`;
          document.getElementById('ratio-black').innerText = `Oran: ${rb}:1`;

          const bWhite = document.getElementById('badge-white');
          if (rw >= 7.0) { bWhite.innerText = 'AAA (Mükemmel)'; bWhite.className = 'px-1.5 py-0.5 rounded font-bold bg-emerald-500/80 text-white'; }
          else if (rw >= 4.5) { bWhite.innerText = 'AA (Uygun)'; bWhite.className = 'px-1.5 py-0.5 rounded font-bold bg-teal-500/80 text-white'; }
          else { bWhite.innerText = 'Düşük Kontrast'; bWhite.className = 'px-1.5 py-0.5 rounded font-bold bg-rose-500/80 text-white'; }

          const bBlack = document.getElementById('badge-black');
          if (rb >= 7.0) { bBlack.innerText = 'AAA (Mükemmel)'; bBlack.className = 'px-1.5 py-0.5 rounded font-bold bg-emerald-500/80 text-white'; }
          else if (rb >= 4.5) { bBlack.innerText = 'AA (Uygun)'; bBlack.className = 'px-1.5 py-0.5 rounded font-bold bg-teal-500/80 text-white'; }
          else { bBlack.innerText = 'Düşük Kontrast'; bBlack.className = 'px-1.5 py-0.5 rounded font-bold bg-rose-500/80 text-white'; }
        }

        function setExportFormat(fmt) {
          exportFormat = fmt;
          const btnCss = document.getElementById('btn-fmt-css');
          const btnTw = document.getElementById('btn-fmt-tailwind');
          if (fmt === 'css') {
            btnCss.className = 'px-2.5 py-1 rounded-md bg-mistral-orange text-white font-semibold transition';
            btnTw.className = 'px-2.5 py-1 rounded-md text-mistral-ink font-boldbg-mistral-cream hover:bg-mistral-cream-deeper text-mistral-ink border border-mistral-beige-deep transition';
          } else {
            btnTw.className = 'px-2.5 py-1 rounded-md bg-mistral-orange text-white font-semibold transition';
            btnCss.className = 'px-2.5 py-1 rounded-md text-mistral-ink font-boldbg-mistral-cream hover:bg-mistral-cream-deeper text-mistral-ink border border-mistral-beige-deep transition';
          }
          updateCodeExport();
        }

        function updateCodeExport() {
          const out = document.getElementById('code-output');
          if (currentColors.length === 0) return;

          if (exportFormat === 'css') {
            let css = ':root {\\n';
            currentColors.forEach((c, i) => {
              css += `  --palette-color-${i + 1}: ${c.hex}; /* ${c.name} */\\n`;
            });
            css += '}';
            out.innerText = css;
          } else {
            let tw = 'module.exports = {\\n  theme: {\\n    extend: {\\n      colors: {\\n        palette: {\\n';
            currentColors.forEach((c, i) => {
              tw += `          ${(i + 1) * 100}: '${c.hex}', // ${c.name}\\n`;
            });
            tw += '        }\\n      }\\n    }\\n  }\\n};';
            out.innerText = tw;
          }
        }

        function copyCode() {
          const code = document.getElementById('code-output').innerText;
          navigator.clipboard.writeText(code);
          const btn = document.getElementById('btn-copy-code');
          btn.innerText = '✓ Kopyalandı!';
          setTimeout(() => btn.innerHTML = '<span>📋</span> Kopyala', 2000);
        }

        function copyText(txt) {
          navigator.clipboard.writeText(txt);
          alert(`"✓ ${txt}" panoya kopyalandı!`);
        }

        document.addEventListener('DOMContentLoaded', () => {
          generatePalette();
        });
