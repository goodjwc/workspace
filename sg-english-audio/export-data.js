// sg-english/js/data.js 의 회화 데이터를 JSON으로 출력 (앱과 같은 원본 사용)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '../sg-english/js/data.js'), 'utf8');
const ctx = {};
vm.runInNewContext(src + '\n;this.SCENES = SCENES;', ctx);
process.stdout.write(JSON.stringify(ctx.SCENES, null, 1));
