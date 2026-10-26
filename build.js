// Builds dist/index.html: one self-contained file with all CSS and JS inlined.
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const order = ['theory.js', 'audio.js', 'render.js', 'app.js', 'views.js', 'views2.js', 'practice.js', 'quiz.js', 'learn.js', 'qualities.js'];
const js = order.map(f => `/* ---- ${f} ---- */\n` + src(f)).join('\n') + `\n/* ---- start ---- */\ntry { boot(); } catch (e) { console.error(e); var b = document.getElementById('boot'); if (b) { b.querySelector('h2').textContent = 'The app could not start'; var p = document.createElement('p'); p.textContent = 'Error: ' + e.message; b.insertBefore(p, b.children[1]); } }\n`;
if (js.includes('</script')) throw new Error('script terminator inside JS');
const html = src('index.template.html').replace('/*CSS*/', () => src('styles.css')).replace('/*JS*/', () => js);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(1) + ' KB');
