import { createHash } from 'crypto';
import https from 'https';

// Función para fetch sin verificación SSL
const fetchNoSSL = async (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    resolve(fetch(url, { ...options, agent }));
  });
};

const SYSTEM_INSTRUCTION = `You generate ONE complete HTML file for a cinematic digital invitation. You MUST include Three.js particles, tsParticles, and GSAP ScrollTrigger. Output raw HTML only — no markdown.

===== MANDATORY <head> CDN SCRIPTS =====
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tsparticles-engine@2/tsparticles.engine.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">
No other libraries.

===== MANDATORY 3 EFFECTS (include ALL 3 or your output is REJECTED) =====

1. THREE.JS HERO PARTICLES — Place this inside the hero <section> after opening tag, then add a <script> after </section>:
<canvas id="hero-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;"></canvas>
Then after </section>:
<script>(function(){var c=document.getElementById('hero-canvas');if(!c)return;c.parentElement.style.position='relative';var s=new THREE.Scene();var cm=new THREE.PerspectiveCamera(75,c.clientWidth/c.clientHeight,0.1,1000);cm.position.z=50;var r=new THREE.WebGLRenderer({canvas:c,alpha:true,antialias:true});r.setSize(c.clientWidth,c.clientHeight);r.setPixelRatio(Math.min(window.devicePixelRatio,2));var n=100;var p=new Float32Array(n*3);var cl=new Float32Array(n*3);for(var i=0;i<n;i++){p[i*3]=(Math.random()-0.5)*100;p[i*3+1]=(Math.random()-0.5)*100;p[i*3+2]=(Math.random()-0.5)*100;cl[i*3]=0.4+Math.random()*0.6;cl[i*3+1]=0.6+Math.random()*0.4;cl[i*3+2]=0.8+Math.random()*0.2;}var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(cl,3));var m=new THREE.PointsMaterial({size:0.8,vertexColors:true,transparent:true,opacity:0.7,sizeAttenuation:true});var pt=new THREE.Points(g,m);s.add(pt);function a(){requestAnimationFrame(a);pt.rotation.y+=0.001;pt.rotation.x+=0.0005;var pa=g.attributes.position.array;for(var i=1;i<pa.length;i+=3){pa[i]+=Math.sin(Date.now()*0.001+i)*0.02;}g.attributes.position.needsUpdate=true;r.render(s,cm);}a();window.addEventListener('resize',function(){cm.aspect=c.clientWidth/c.clientHeight;cm.updateProjectionMatrix();r.setSize(c.clientWidth,c.clientHeight);});})();</script>

2. TSPARTICLES — Add in at least 1 section (countdown, itinerary, etc):
<div id="tsp-X" class="absolute inset-0" style="z-index:1;"></div>
Then after that section's </section>:
<script>(function(){if(typeof tsParticles==='undefined')return;tsParticles.load("tsp-X",{fullScreen:{enable:false},particles:{number:{value:50},color:{value:["PRIMARY_HEX","SECONDARY_HEX","#ffffff"]},shape:{type:"circle"},size:{value:{min:1,max:3}},move:{enable:true,speed:0.5,direction:"top",outModes:"out"},opacity:{value:{min:0.15,max:0.6}},links:{enable:false}},interactivity:{events:{onHover:{enable:false}}}});})();</script>
(Replace "tsp-X" with unique id, PRIMARY_HEX/SECONDARY_HEX with actual colors)

3. GSAP SCROLLTRIGGER — Place at end of <body>:
<script>gsap.registerPlugin(ScrollTrigger);gsap.utils.toArray('section').forEach(function(s){gsap.from(s,{scrollTrigger:{trigger:s,start:'top 85%'},opacity:0,y:40,duration:0.8,ease:'power2.out'});gsap.utils.toArray(s.querySelectorAll('h1,h2,h3,p,img')).forEach(function(e,i){gsap.from(e,{scrollTrigger:{trigger:e,start:'top 90%'},opacity:0,y:25,duration:0.6,delay:i*0.08,ease:'power2.out'});});});</script>

===== GEMINI_GENERATE BACKGROUNDS =====
✅ ONLY correct usage — inline style on a section/div:
   style="background-image: url('GEMINI_GENERATE:cinematic description here'); background-size: cover; background-position: center;"
   Then add overlay: <div class="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70"></div>

❌ FORBIDDEN — These will BREAK the page:
   - class="bg-[url('GEMINI_GENERATE:...')]" ← Tailwind JIT CANNOT process this at runtime
   - <img src="GEMINI_GENERATE:..."> for backgrounds
   - GEMINI_GENERATE as small/floating/decorative elements
   - GEMINI_GENERATE without overlay for text readability

===== LOCAL EVENT PHOTOS =====
Use <img src="/img/FOLDER/file.jpg" data-gemini-id="MODULE-imagen" class="object-cover"> inside sized containers.
Folders: xv-años, boda-color, boda-americana, boda-gay-hombres, boda-gay-mujeres, bautizo, primera-comunión, cumpleaños-niño, cumpleaños-niña, baby-shower
These are placeholders the user will replace.
⚠️ CRITICAL: ONLY use filenames that are EXPLICITLY listed in the user's prompt under "Available images". NEVER invent, guess, or fabricate filenames like foto-1.jpg, image-1.jpg, photo.jpg, imagen.jpg, hero.jpg, background.jpg, or ANY name not in the provided list. If no images are listed, use GEMINI_GENERATE backgrounds instead.

===== MANDATORY PHOTOS BY MODULE (when images are available) =====
When the prompt includes "Available images", you MUST include <img> tags with those photos in the following modules:
- PORTADA (hero/cover): MUST include <img src="/img/FOLDER/[hero-portrait-file]" data-gemini-id="portada-imagen" class="object-cover"> as the main hero image. This is NON-OPTIONAL.
- PADRES (parents): MUST include <img src="/img/FOLDER/[parents-file]" data-gemini-id="padres-imagen" class="object-cover"> showing the parents/family.
- UBICACION (location): SHOULD include <img src="/img/FOLDER/[venue-file]" data-gemini-id="ubicacion-imagen" class="object-cover"> if a suitable venue/exterior image exists.
- BAUTIZO/PRIMERA COMUNION modules: MUST include <img> with ceremony-appropriate image.
Pick the best matching file for each module based on the filename keywords (portrait→hero, parents→padres, church→ubicacion, etc.).

===== data-gemini-id (MANDATORY on ALL text/image elements) =====
Format: data-gemini-id="MODULE-ELEMENT" (e.g., portada-titulo, padres-nombre, itinerario-hora)
Must be on ALL: h1-h6, p, span, a, img, iframe
Modules: portada, padres, itinerario, ubicacion, countdown, padrinos, corte, vestimenta, regalos

===== DESIGN RULES =====
- CSS :root { --color-primary: #hex; --color-secondary: #hex; }
- 2-3 Google Fonts (decorative headings + elegant body)
- Alternate sections: cinematic bg + overlay → dark cinematic → light/gradient → glassmorphism
- ITINERARY: vertical timeline with flexbox ONLY. NEVER <table>. Left=time badge, center=dot+line, right=card.
- CSS animations: gradientShift, float, pulseGlow as @keyframes
- Countdown: styled cards with glow/pulse
- Hover: scale 1.03 + shadow elevation
- Keep particles <150 for mobile performance

===== METADATA (after </html>) =====
<!-- INVITATION_DATA:
{"title":"[Spanish title]","eventType":"[XV Años|Boda Tradicional|etc]","theme":"[Design theme]","colors":["Color (#hex)","Color (#hex)"],"tags":["kw1","kw2","kw3","kw4","kw5"],"generatedAt":"YYYY-MM-DD HH:mm:ss"}
-->

Now generate the complete HTML invitation: `;

export const generateWithGemini = async (prompt, apiKey, model = 'gemini-3.1-pro', options = {}) => {
  const { eventType, theme, primaryColor, secondaryColor, imageFiles, promptInstruction } = options;
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const promptWithDate = prompt.replace(/SYSTEM_TIMESTAMP:\s*\S+/, `SYSTEM_TIMESTAMP: ${currentDate}`);
  
  const promptImageContext = promptInstruction ? `\n\n${promptInstruction}` : '';
  const fullPrompt = `${SYSTEM_INSTRUCTION}${promptImageContext}${promptWithDate}`;
  
  // CORRECTO: usar v1beta sin API key en URL, mover al header
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  console.log('=== GEMINI HTML GENERATION ===');
  console.log('Model:', model);
  console.log('Prompt length:', fullPrompt.length);
  console.log('=====================================');

  const response = await fetchNoSSL(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey  // API key en header
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: fullPrompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 20,
        maxOutputTokens: 1500000
      }
    })
  });

  console.log('HTTP:', response.status);

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  console.log('Output length:', generatedText?.length || 0);

  if (!generatedText) {
    throw new Error('Empty response from Gemini');
  }

  const html = cleanHtml(generatedText);
  const fixedHtml = fixTailwindBgGemini(html);
  const libHtml = injectMandatoryLibraries(fixedHtml);
  const metaHtml = injectEditorMetadata(libHtml, eventType, theme, primaryColor, secondaryColor);
  const finalHtml = fixInvalidImagePaths(metaHtml, imageFiles);
  return finalHtml;
};

const fixTailwindBgGemini = (html) => {
  if (!html) return html;
  const bgTailwindRegex = /class="([^"]*?)bg-\[url\('GEMINI_GENERATE:([^']+)'\)\]([^"]*?)"/gi;
  let result = html;
  let match;
  let count = 0;
  while ((match = bgTailwindRegex.exec(html)) !== null) {
    const before = match[1];
    const description = match[2];
    const after = match[3];
    const newStyle = `style="background-image: url('GEMINI_GENERATE:${description}'); background-size: cover; background-position: center;"`;
    const classAttr = `class="${before}${after}"`;
    result = result.replace(match[0], `${classAttr} ${newStyle}`);
    count++;
  }
  if (count > 0) console.log(`Fixed ${count} bg-[url('GEMINI_GENERATE:...')] → inline style`);
  return result;
};

const injectMandatoryLibraries = (html) => {
  if (!html || !html.includes('<!DOCTYPE')) return html;

  console.log('=== INJECTING MANDATORY LIBRARIES ===');

  let result = html;

  const hasThreeJs = result.includes('three.min.js');
  const hasTsParticles = result.includes('tsparticles');
  const hasGSAP = result.includes('gsap.min.js');
  const hasScrollTrigger = result.includes('ScrollTrigger');
  const hasThreeCanvas = result.includes('THREE.');
  const hasTsParticlesLoad = result.includes('tsParticles.load');
  const hasGSAPRegister = result.includes('gsap.registerPlugin');

  const mandatoryScripts = [];
  if (!hasThreeJs) mandatoryScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>');
  if (!hasTsParticles) {
    mandatoryScripts.push('<script src="https://cdn.jsdelivr.net/npm/tsparticles-engine@2/tsparticles.engine.min.js"></script>');
    mandatoryScripts.push('<script src="https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js"></script>');
  }
  if (!hasGSAP) mandatoryScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>');
  if (!hasScrollTrigger) mandatoryScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>');

  if (mandatoryScripts.length > 0) {
    const injection = '\n    <!-- MANDATORY CDN INJECTED -->\n    ' + mandatoryScripts.join('\n    ') + '\n';
    result = result.replace('</head>', injection + '</head>');
    console.log('Injected CDN scripts:', mandatoryScripts.length);
  }

  const primaryColor = result.match(/--color-primary:\s*([^;]+)/)?.[1]?.trim() || '#c084fc';
  const secondaryColor = result.match(/--color-secondary:\s*([^;]+)/)?.[1]?.trim() || '#f472b6';

  if (!hasThreeCanvas) {
    console.log('Injecting Three.js hero particles');
    const heroSection = result.match(/<section[^>]*class="[^"]*(?:hero|cover|portada|min-h-screen)[^"]*"[^>]*>/i);
    const firstSection = result.match(/<section[^>]*>/i);

    const targetSection = heroSection?.[0] || firstSection?.[0];
    if (targetSection) {
      const threeJsBlock = `
<!-- INJECTED: Three.js Hero Particles -->
<canvas id="hero-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;"></canvas>
<script>
(function(){
  var canvas=document.getElementById('hero-canvas');
  if(!canvas)return;
  var parent=canvas.parentElement;
  if(parent)parent.style.position='relative';
  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(75,canvas.clientWidth/canvas.clientHeight,0.1,1000);
  camera.position.z=50;
  var renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true});
  renderer.setSize(canvas.clientWidth,canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  var count=100;
  var positions=new Float32Array(count*3);
  var colors=new Float32Array(count*3);
  var pc='${primaryColor}';
  var sc='${secondaryColor}';
  function hexToRGB(h){var r=parseInt(h.slice(1,3),16)/255;var g=parseInt(h.slice(3,5),16)/255;var b=parseInt(h.slice(5,7),16)/255;return[r,g,b];}
  var pr=hexToRGB(pc);var sr=hexToRGB(sc);
  for(var i=0;i<count;i++){
    positions[i*3]=(Math.random()-0.5)*100;
    positions[i*3+1]=(Math.random()-0.5)*100;
    positions[i*3+2]=(Math.random()-0.5)*100;
    var mix=Math.random();
    colors[i*3]=pr[0]*mix+sr[0]*(1-mix);
    colors[i*3+1]=pr[1]*mix+sr[1]*(1-mix);
    colors[i*3+2]=pr[2]*mix+sr[2]*(1-mix);
  }
  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  var mat=new THREE.PointsMaterial({size:0.8,vertexColors:true,transparent:true,opacity:0.7,sizeAttenuation:true});
  var points=new THREE.Points(geo,mat);
  scene.add(points);
  function animate(){
    requestAnimationFrame(animate);
    points.rotation.y+=0.001;
    points.rotation.x+=0.0005;
    var pos=geo.attributes.position.array;
    for(var i=1;i<pos.length;i+=3){pos[i]+=Math.sin(Date.now()*0.001+i)*0.02;}
    geo.attributes.position.needsUpdate=true;
    renderer.render(scene,camera);
  }
  animate();
  window.addEventListener('resize',function(){
    camera.aspect=canvas.clientWidth/canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth,canvas.clientHeight);
  });
})();
</script>`;
      result = result.replace(targetSection, targetSection + threeJsBlock);
    }
  }

  if (!hasTsParticlesLoad) {
    console.log('Injecting tsParticles section');
    const tsparticlesBlock = `
<!-- INJECTED: tsParticles floating effect -->
<div id="tsparticles-global" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;"></div>
<script>
(function(){
  if(typeof tsParticles==='undefined')return;
  var pc='${primaryColor}';
  var sc='${secondaryColor}';
  tsParticles.load("tsparticles-global",{
    fullScreen:{enable:false},
    particles:{
      number:{value:40},
      color:{value:[pc,sc,"#ffffff"]},
      shape:{type:"circle"},
      size:{value:{min:1,max:3}},
      move:{enable:true,speed:0.5,direction:"top",outModes:"out"},
      opacity:{value:{min:0.15,max:0.6}},
      links:{enable:false}
    },
    interactivity:{events:{onHover:{enable:false}}}
  });
})();
</script>`;
    result = result.replace('</body>', tsparticlesBlock + '\n</body>');
  }

  if (!hasGSAPRegister) {
    console.log('Injecting GSAP ScrollTrigger animations');
    const gsapBlock = `
<!-- INJECTED: GSAP ScrollTrigger -->
<script>
gsap.registerPlugin(ScrollTrigger);
gsap.utils.toArray('section').forEach(function(section){
  gsap.from(section,{
    scrollTrigger:{trigger:section,start:'top 85%',toggleActions:'play none none none'},
    opacity:0,y:40,duration:0.8,ease:'power2.out'
  });
  gsap.utils.toArray(section.querySelectorAll('h1,h2,h3,p,img')).forEach(function(el,i){
    gsap.from(el,{
      scrollTrigger:{trigger:el,start:'top 90%'},
      opacity:0,y:25,duration:0.6,delay:i*0.08,ease:'power2.out'
    });
  });
});
</script>`;
    result = result.replace('</body>', gsapBlock + '\n</body>');
  }

  console.log('=== INJECTION COMPLETE ===');
  return result;
};

const injectEditorMetadata = (html, eventType, theme, primaryColor, secondaryColor) => {
  if (!html || !html.includes('<!DOCTYPE')) return html;
  if (!eventType && !theme && !primaryColor && !secondaryColor) return html;

  const existingRegex = /<script type="application\/json" id="invitation-editor-metadata">[\s\S]*?<\/script>/g;
  const cleanHtml = html.replace(existingRegex, '');

  const metadata = {
    version: 1,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    eventType: eventType || '',
    theme: theme || '',
    primaryColor: primaryColor || '#f472b6',
    secondaryColor: secondaryColor || '#fb7185',
    hiddenModules: [],
    elementStyles: {}
  };

  const scriptTag = `<script type="application/json" id="invitation-editor-metadata">${JSON.stringify(metadata)}</script>`;
  console.log('✅ Injected invitation-editor-metadata:', JSON.stringify({ eventType, theme, primaryColor, secondaryColor }));

  if (cleanHtml.includes('</body>')) {
    return cleanHtml.replace('</body>', `${scriptTag}\n</body>`);
  }
  return cleanHtml + '\n' + scriptTag;
};

const fixInvalidImagePaths = (html, imageFiles) => {
  if (!html || !imageFiles || imageFiles.length === 0) return html;

  const imgSrcRegex = /src="\/img\/([^/]+)\/([^"]+)"/gi;
  let result = html;
  let fixCount = 0;

  result = result.replace(imgSrcRegex, (match, folder, filename) => {
    const validFile = imageFiles.find(f => f.folder === folder && f.filename === filename);
    if (validFile) return match;

    const folderFiles = imageFiles.filter(f => f.folder === folder);
    if (folderFiles.length === 0) return match;

    const replacement = folderFiles[0].filename;
    fixCount++;
    console.log(`🔧 Fixed invalid image: /img/${folder}/${filename} → /img/${folder}/${replacement}`);
    return `src="/img/${folder}/${replacement}"`;
  });

  if (fixCount > 0) console.log(`✅ Fixed ${fixCount} invalid image paths`);
  return result;
};

const cleanHtml = (text) => {
  if (!text) return '';
  
  let cleanedHtml = text;
  
  // Limpiar markdown
  cleanedHtml = cleanedHtml.replace(/```html\s*/g, '').replace(/```\s*/g, '').replace(/```/g, '');
  
  // Buscar bloque HTML completo
  const htmlMatch = cleanedHtml.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (htmlMatch) {
    return htmlMatch[0];
  }
  
  return cleanedHtml;
};
