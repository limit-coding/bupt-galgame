import {mkdir,cp,writeFile,readFile,chmod,rm} from 'node:fs/promises';
const folder='release/西土城四季-2.0';await rm(folder,{recursive:true,force:true});await mkdir(`${folder}/scripts`,{recursive:true});
await cp('dist',`${folder}/dist`,{recursive:true});await cp('scripts/serve.mjs',`${folder}/scripts/serve.mjs`);await cp('Start-Campus.command',`${folder}/Start-Campus.command`);await chmod(`${folder}/Start-Campus.command`,0o755);
await cp('README.md',`${folder}/项目说明.md`);await cp('THIRD_PARTY_NOTICES.txt',`${folder}/THIRD_PARTY_NOTICES.txt`);
await writeFile(`${folder}/开始阅读.txt`, `西土城四季 · 北邮校园漫游 2.0\n\nMac：双击 Start-Campus.command。此电脑需要 Node.js 20.19+ 或 Python 3。\n终端：在本文件夹执行 node scripts/serve.mjs --open，然后打开 http://127.0.0.1:4173。\n关闭运行窗口或按 Ctrl+C 停止。\n\n体验内容：51 栋命名建筑、四季、日间/黄昏/夜晚、第一/第三人称漫游、自由飞行、物件布置、九处校园手记、小地图、可选声音与明信片。\n桌面：WASD / 方向键移动、鼠标转向、空格跳跃、V 切换人称、F 飞行或落地、E 阅读、Esc 暂停；触屏：方向按钮移动、拖动画面转向。\n飞行：WASD 移动、空格上升、Q / Ctrl 下降、Shift 加速、拖动画面转向。可放置树、长椅和石块，支持撤销与本地保存。\n所有运行素材已随包附带，使用时不需要连接互联网。打开参考资料链接需要联网。\n进度仅保存在浏览器本地；使用相同浏览器与端口恢复。\n\n模型文件在 dist/models。固定主体与默认绿叶场景分别导出；动态效果和中文标牌绘制由程序提供。\n这是依据公开示意图和照片创作的风格化校园作品；建筑尺寸、高度与部分外观为估算，不是测绘或写实复刻。\n详细来源与限制见 项目说明.md。\n`);
console.log(`Prepared ${folder}`);
