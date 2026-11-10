import fs from 'fs';
['assets/js/search.js', 'assets/js/tools-logic.js'].forEach(f => {
    let s = fs.readFileSync(f, 'utf8');
    const fixed = s.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
    if (fixed !== s) {
        fs.writeFileSync(f, fixed);
        console.log('Fixed', f);
    }
});
