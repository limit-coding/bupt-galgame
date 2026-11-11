import {toWorld} from './campus-data.js';
const mapSource='https://welcome.bupt.edu.cn/info/1003/1172.htm';
const raw=[
 ['west-gate','西门','从这里，走进北邮。',183,1114,'校园的西侧入口，与东西向的校园步行轴线相接。抬头看看门廊，再沿前方道路向校园中心走去。','入口',null,'https://vi.bupt.edu.cn/info/1102/1055.htm'],
 ['motto','校训石','把脚步放慢一点。',421,1114,'校园示意图把校训石标在西门通向中心区域的路旁。模型以简化石块表示这个位置。四周的树木与座椅，是本作品为漫游补充的景观。','校园景观',null,mapSource],
 ['main','未来学习大楼','同一座楼，新的面貌。',660,1114,'这座建筑在当前校园地图中标作“未来学习大楼”。模型参考官网照片中的白色竖向构件、中央玻璃带和入口形态；楼高与背面仍为估算。','教学科研','main','https://vi.bupt.edu.cn/info/1102/1057.htm'],
 ['teaching4','教四楼','暖色墙面下的日常。',405,996,'教四楼位于西门步行轴线北侧。暖色外墙与坡屋顶来自官方照片参考，平面关系依据校园示意图。','教学科研','teaching4','https://vi.bupt.edu.cn/info/1102/1065.htm'],
 ['teaching3','教三楼','从窗格之间认出校园。',405,1140,'教三楼位于步行轴线南侧。蓝色玻璃、弧形立面和檐口构成了这一版模型的辨识特征。完整轮廓与局部尺寸仍待核对。','教学科研','teaching3','https://vi.bupt.edu.cn/info/1102/1064.htm'],
 ['library','图书馆','给安静留一个位置。',680,710,'图书馆位于校园中部。浅色立面与竖向窗间构件参考官方照片；馆前的绿地和小路连着教学区与生活区。此版本展示建筑外部。','校园阅读','library','https://vi.bupt.edu.cn/info/1102/1061.htm'],
 ['pine-grove','小松林','听一会儿风。',654,694,'校园示意图在图书馆西侧标有“小松林”。作品在这片区域保留常绿树冠，让它在冬季与周围落叶树形成不同的轮廓。具体树木位置尚未实测。','校园景观',null,mapSource],
 ['auditorium','科学会堂','一场相聚的地方。',895,1008,'科学会堂位于校园东侧、运动场西侧。官方照片中的红色入口构件与浅色外框，成为模型的主要外观参考。','公共空间','auditorium','https://vi.bupt.edu.cn/info/1102/1066.htm'],
 ['sports','运动场','再绕校园走一圈。',1135,1033,'校园东侧的运动场与体育馆、游泳馆共同组成运动区域。沿着路线走到这里，这次校园漫游也接近尾声。跑道尺寸为示意图推演。','体育运动',null,mapSource],
];
export const places=raw.map(([id,name,subtitle,mx,my,description,category,building,source])=>{const [x,z]=toWorld(mx,my);return {id,name,subtitle,x,z,description,category,building,source};});
export const placeById=new Map(places.map(p=>[p.id,p]));
export const tourOrder=places.map(p=>p.id);
export const WEST_GATE={x:places[0].x,z:places[0].z};
