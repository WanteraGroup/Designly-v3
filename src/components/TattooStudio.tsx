import { ChangeEvent, DragEvent, useState } from 'react';
import { Download, FileImage, Grid3X3, ImagePlus, Layers3, PenTool, Share2, Sparkles, Upload } from 'lucide-react';
import { editCreativeImage, generateCreativeImage } from '../lib/creative-api';

type Lang = 'hu'|'en'|'de'|'fr'|'es'|'it'|'pl'|'uk'|'ro'|'nl';
type SourceMode = 'upload'|'ai';
type Format = 'portrait'|'square'|'landscape';

const UI: Record<Lang, Record<string,string>> = {
  hu: {
    title:'PRO TATTOO STUDIO', desc:'Feltöltött képből vagy AI-generálásból készíts izolált, 2D tattoo stencil mintát.',
    source:'Forrás', upload:'Kép feltöltése', ai:'AI generálás', uploadHint:'Húzd ide a képet, vagy válaszd ki a gépről.', formats:'Kimeneti formátum',
    portrait:'Álló 2:3', square:'Négyzet 1:1', landscape:'Fekvő 3:2', concept:'AI tattoo koncepció',
    conceptPlaceholder:'Pl. Odin két hollóval, kelta fonatokkal, csak fekete tattoo vonalmunka.',
    removeBody:'Testrész / mockup eltávolítása', removeBodyHint:'A végső minta önálló legyen, bőr és test nélkül.', ink:'Stencil vonal / tinta',
    fine:'Finom', standard:'Standard', bold:'Erős', guides:'Segédvonalak a szalonmunkalapon', center:'Középvonal', grid:'Rács', mirror:'Tükörtengely',
    generate:'Stencil készítése', generating:'Stencil készül…', sourcePreview:'FORRÁS ELŐNÉZET', result:'SZALONKÉSZ STENCIL', transparent:'Átlátszó PNG',
    stencil:'Stencil PNG', sheet:'Szalon munkalap', share:'Küldés / megosztás', empty:'Itt jelenik meg az izolált stencil.', remove:'Kép törlése',
    aiSource:'AI FORRÁSKÉP', uploadedSource:'FELTÖLTÖTT KÉP', note:'A kimenet különálló 2D tattoo artwork. A szalon munkalap külön illesztési jeleket és segédvonalakat tartalmaz.',
    error:'A stencil készítése sikertelen.', max:'JPG, PNG vagy WEBP • max. 10 MB'
  },
  en: {
    title:'PRO TATTOO STUDIO', desc:'Create an isolated 2D tattoo stencil from an uploaded image or an AI-generated concept.',
    source:'Source', upload:'Upload image', ai:'AI generate', uploadHint:'Drop an image here or choose a file.', formats:'Output format',
    portrait:'Portrait 2:3', square:'Square 1:1', landscape:'Landscape 3:2', concept:'AI tattoo concept',
    conceptPlaceholder:'e.g. Odin with two ravens and Celtic knotwork, black tattoo linework only.', removeBody:'Remove body / mockup',
    removeBodyHint:'The final artwork must be standalone, with no skin or body.', ink:'Stencil line / ink', fine:'Fine', standard:'Standard', bold:'Bold',
    guides:'Salon worksheet guides', center:'Center line', grid:'Grid', mirror:'Mirror axis', generate:'Create stencil', generating:'Creating stencil…',
    sourcePreview:'SOURCE PREVIEW', result:'SALON-READY STENCIL', transparent:'Transparent PNG', stencil:'Stencil PNG', sheet:'Salon worksheet',
    share:'Share / send', empty:'The isolated stencil appears here.', remove:'Remove image', aiSource:'AI SOURCE IMAGE', uploadedSource:'UPLOADED IMAGE',
    note:'The output is standalone 2D tattoo artwork. The salon worksheet adds separate registration marks and alignment guides.', error:'Stencil generation failed.', max:'JPG, PNG or WEBP • max. 10 MB'
  },
  de: {
    title:'PRO TATTOO STUDIO', desc:'Erstelle aus einem hochgeladenen Bild oder einer KI-Idee ein isoliertes 2D-Tattoo-Stencil.',
    source:'Quelle', upload:'Bild hochladen', ai:'KI generieren', uploadHint:'Bild hier ablegen oder Datei auswählen.', formats:'Ausgabeformat', portrait:'Hochformat 2:3',
    square:'Quadrat 1:1', landscape:'Querformat 3:2', concept:'KI-Tattoo-Konzept', conceptPlaceholder:'z. B. Odin mit zwei Raben und keltischem Knotenmuster, nur schwarze Tattoo-Linien.',
    removeBody:'Körper / Mockup entfernen', removeBodyHint:'Das Motiv muss freistehend ohne Haut und Körper sein.', ink:'Stencil-Linie / Tinte',
    fine:'Fein', standard:'Standard', bold:'Stark', guides:'Hilfslinien im Salonblatt', center:'Mittellinie', grid:'Raster', mirror:'Spiegelachse',
    generate:'Stencil erstellen', generating:'Stencil wird erstellt…', sourcePreview:'QUELLVORSCHAU', result:'SALONFERTIGES STENCIL', transparent:'Transparente PNG',
    stencil:'Stencil PNG', sheet:'Salon-Arbeitsblatt', share:'Teilen / senden', empty:'Hier erscheint das isolierte Stencil.', remove:'Bild entfernen',
    aiSource:'KI-QUELLBILD', uploadedSource:'HOCHGELADENES BILD', note:'Die Ausgabe ist eigenständige 2D-Tattoo-Kunst. Das Salonblatt enthält separate Registriermarken und Ausrichtungshilfen.',
    error:'Stencil-Erstellung fehlgeschlagen.', max:'JPG, PNG oder WEBP • max. 10 MB'
  },
  fr: {
    title:'PRO TATTOO STUDIO', desc:'Créez un stencil tattoo 2D isolé à partir d’une image importée ou d’un concept IA.',
    source:'Source', upload:'Importer une image', ai:'Générer avec IA', uploadHint:'Déposez une image ou choisissez un fichier.', formats:'Format de sortie',
    portrait:'Portrait 2:3', square:'Carré 1:1', landscape:'Paysage 3:2', concept:'Concept tattoo IA', conceptPlaceholder:'ex. Odin avec deux corbeaux et motifs celtiques, lignes noires uniquement.',
    removeBody:'Retirer corps / mockup', removeBodyHint:'Le motif final doit être autonome, sans peau ni corps.', ink:'Ligne / encre stencil',
    fine:'Fin', standard:'Standard', bold:'Fort', guides:'Repères feuille salon', center:'Axe central', grid:'Grille', mirror:'Axe miroir',
    generate:'Créer le stencil', generating:'Création du stencil…', sourcePreview:'APERÇU SOURCE', result:'STENCIL PRÊT SALON', transparent:'PNG transparent',
    stencil:'PNG stencil', sheet:'Feuille salon', share:'Partager / envoyer', empty:'Le stencil isolé apparaîtra ici.', remove:'Supprimer l’image',
    aiSource:'IMAGE SOURCE IA', uploadedSource:'IMAGE IMPORTÉE', note:'La sortie est une illustration tattoo 2D isolée. La feuille salon ajoute séparément les marques et repères.',
    error:'Échec de création du stencil.', max:'JPG, PNG ou WEBP • max. 10 Mo'
  },
  es: {
    title:'PRO TATTOO STUDIO', desc:'Crea un stencil de tatuaje 2D aislado desde una imagen subida o un concepto generado por IA.',
    source:'Fuente', upload:'Subir imagen', ai:'Generar con IA', uploadHint:'Arrastra una imagen o elige un archivo.', formats:'Formato de salida',
    portrait:'Vertical 2:3', square:'Cuadrado 1:1', landscape:'Horizontal 3:2', concept:'Concepto tattoo IA', conceptPlaceholder:'Ej. Odín con dos cuervos y nudos celtas, solo líneas negras de tatuaje.',
    removeBody:'Eliminar cuerpo / mockup', removeBodyHint:'El arte final debe quedar aislado, sin piel ni cuerpo.', ink:'Línea / tinta stencil',
    fine:'Fina', standard:'Estándar', bold:'Fuerte', guides:'Guías de hoja de estudio', center:'Línea central', grid:'Cuadrícula', mirror:'Eje espejo',
    generate:'Crear stencil', generating:'Creando stencil…', sourcePreview:'VISTA PREVIA DE FUENTE', result:'STENCIL LISTO PARA ESTUDIO', transparent:'PNG transparente',
    stencil:'PNG stencil', sheet:'Hoja de estudio', share:'Compartir / enviar', empty:'Aquí aparecerá el stencil aislado.', remove:'Eliminar imagen',
    aiSource:'IMAGEN FUENTE IA', uploadedSource:'IMAGEN SUBIDA', note:'La salida es arte tattoo 2D aislado. La hoja añade por separado marcas de registro y guías.',
    error:'No se pudo crear el stencil.', max:'JPG, PNG o WEBP • máx. 10 MB'
  },
  it: {
    title:'PRO TATTOO STUDIO', desc:'Crea uno stencil tattoo 2D isolato da un’immagine caricata o da un concept generato dall’AI.',
    source:'Fonte', upload:'Carica immagine', ai:'Genera con AI', uploadHint:'Trascina un’immagine o scegli un file.', formats:'Formato di uscita',
    portrait:'Verticale 2:3', square:'Quadrato 1:1', landscape:'Orizzontale 3:2', concept:'Concept tattoo AI', conceptPlaceholder:'Es. Odino con due corvi e nodi celtici, solo linee tattoo nere.',
    removeBody:'Rimuovi corpo / mockup', removeBodyHint:'Il risultato deve essere autonomo, senza pelle o corpo.', ink:'Linea / inchiostro stencil',
    fine:'Fine', standard:'Standard', bold:'Forte', guides:'Guide foglio studio', center:'Linea centrale', grid:'Griglia', mirror:'Asse specchio',
    generate:'Crea stencil', generating:'Creazione stencil…', sourcePreview:'ANTEPRIMA FONTE', result:'STENCIL PRONTO STUDIO', transparent:'PNG trasparente',
    stencil:'PNG stencil', sheet:'Scheda studio', share:'Condividi / invia', empty:'Qui apparirà lo stencil isolato.', remove:'Rimuovi immagine',
    aiSource:'IMMAGINE FONTE AI', uploadedSource:'IMMAGINE CARICATA', note:'L’output è arte tattoo 2D isolata. La scheda studio aggiunge separatamente marker e guide.',
    error:'Creazione stencil non riuscita.', max:'JPG, PNG o WEBP • max. 10 MB'
  },
  pl: {
    title:'PRO TATTOO STUDIO', desc:'Twórz izolowany stencil tatuażu 2D z przesłanego obrazu lub konceptu AI.',
    source:'Źródło', upload:'Prześlij obraz', ai:'Generuj AI', uploadHint:'Przeciągnij obraz lub wybierz plik.', formats:'Format wyjściowy',
    portrait:'Pion 2:3', square:'Kwadrat 1:1', landscape:'Poziom 3:2', concept:'Koncept tatuażu AI', conceptPlaceholder:'np. Odyn z dwoma krukami i celtyckim splotem, tylko czarne linie tatuażu.',
    removeBody:'Usuń ciało / mockup', removeBodyHint:'Końcowy wzór ma być samodzielny, bez skóry i ciała.', ink:'Linia / tusz stencila',
    fine:'Delikatny', standard:'Standard', bold:'Mocny', guides:'Linie arkusza studia', center:'Oś środkowa', grid:'Siatka', mirror:'Oś lustra',
    generate:'Utwórz stencil', generating:'Tworzenie stencila…', sourcePreview:'PODGLĄD ŹRÓDŁA', result:'STENCIL GOTOWY DO STUDIA', transparent:'PNG z przezroczystością',
    stencil:'PNG stencil', sheet:'Arkusz studia', share:'Udostępnij / wyślij', empty:'Tutaj pojawi się izolowany stencil.', remove:'Usuń obraz',
    aiSource:'OBRAZ ŹRÓDŁOWY AI', uploadedSource:'PRZESŁANY OBRAZ', note:'Wyjście to izolowana sztuka tatuażu 2D. Arkusz studia osobno dodaje znaczniki rejestracyjne i prowadnice.',
    error:'Tworzenie stencila nie powiodło się.', max:'JPG, PNG lub WEBP • maks. 10 MB'
  },
  uk: {
    title:'PRO TATTOO STUDIO', desc:'Створюйте ізольований 2D трафарет тату з завантаженого зображення або AI-концепту.',
    source:'Джерело', upload:'Завантажити зображення', ai:'Генерувати AI', uploadHint:'Перетягніть зображення або виберіть файл.', formats:'Формат виходу',
    portrait:'Вертикаль 2:3', square:'Квадрат 1:1', landscape:'Горизонталь 3:2', concept:'AI-концепт тату', conceptPlaceholder:'напр. Одін із двома воронами та кельтським плетінням, лише чорні лінії.',
    removeBody:'Прибрати тіло / mockup', removeBodyHint:'Фінальний мотив має бути окремим, без шкіри та тіла.', ink:'Лінія / чорнило трафарету',
    fine:'Тонка', standard:'Стандарт', bold:'Сильна', guides:'Напрямні аркуша студії', center:'Центральна лінія', grid:'Сітка', mirror:'Дзеркальна вісь',
    generate:'Створити трафарет', generating:'Створення трафарету…', sourcePreview:'ПЕРЕГЛЯД ДЖЕРЕЛА', result:'ТРАФАРЕТ ГОТОВИЙ ДЛЯ СТУДІЇ', transparent:'PNG з прозорістю',
    stencil:'PNG трафарет', sheet:'Аркуш студії', share:'Поділитися / надіслати', empty:'Тут з’явиться ізольований трафарет.', remove:'Видалити зображення',
    aiSource:'AI ДЖЕРЕЛО', uploadedSource:'ЗАВАНТАЖЕНЕ ЗОБРАЖЕННЯ', note:'Вихід — ізольована 2D tattoo-графіка. Аркуш студії окремо додає реєстраційні позначки та напрямні.',
    error:'Не вдалося створити трафарет.', max:'JPG, PNG або WEBP • макс. 10 МБ'
  },
  ro: {
    title:'PRO TATTOO STUDIO', desc:'Creează un stencil tattoo 2D izolat dintr-o imagine încărcată sau dintr-un concept AI.',
    source:'Sursă', upload:'Încarcă imagine', ai:'Generează cu AI', uploadHint:'Trage imaginea aici sau alege un fișier.', formats:'Format de ieșire',
    portrait:'Portret 2:3', square:'Pătrat 1:1', landscape:'Peisaj 3:2', concept:'Concept tattoo AI', conceptPlaceholder:'ex. Odin cu doi corbi și noduri celtice, doar linii negre de tatuaj.',
    removeBody:'Elimină corpul / mockup-ul', removeBodyHint:'Designul final trebuie să fie independent, fără piele sau corp.', ink:'Linie / cerneală stencil',
    fine:'Fin', standard:'Standard', bold:'Puternic', guides:'Ghidaje foaie salon', center:'Linie centrală', grid:'Grilă', mirror:'Axă oglindă',
    generate:'Creează stencil', generating:'Se creează stencilul…', sourcePreview:'PREVIZUALIZARE SURSĂ', result:'STENCIL GATA PENTRU SALON', transparent:'PNG transparent',
    stencil:'PNG stencil', sheet:'Foaie salon', share:'Distribuie / trimite', empty:'Aici va apărea stencilul izolat.', remove:'Elimină imaginea',
    aiSource:'IMAGINE SURSĂ AI', uploadedSource:'IMAGINE ÎNCĂRCATĂ', note:'Ieșirea este artă tattoo 2D izolată. Foaia salon adaugă separat markere și ghidaje de aliniere.',
    error:'Generarea stencilului a eșuat.', max:'JPG, PNG sau WEBP • max. 10 MB'
  },
  nl: {
    title:'PRO TATTOO STUDIO', desc:'Maak een geïsoleerde 2D tattoo-stencil uit een geüploade afbeelding of een AI-concept.',
    source:'Bron', upload:'Afbeelding uploaden', ai:'AI genereren', uploadHint:'Sleep een afbeelding hierheen of kies een bestand.', formats:'Uitvoerformaat',
    portrait:'Portret 2:3', square:'Vierkant 1:1', landscape:'Landschap 3:2', concept:'AI tattoo-concept', conceptPlaceholder:'bijv. Odin met twee raven en Keltische knopen, alleen zwarte tattoo-lijnen.',
    removeBody:'Lichaam / mockup verwijderen', removeBodyHint:'Het eindmotief moet losstaand zijn, zonder huid of lichaam.', ink:'Stencil-lijn / inkt',
    fine:'Fijn', standard:'Standaard', bold:'Sterk', guides:'Hulplijnen voor salonblad', center:'Middenlijn', grid:'Raster', mirror:'Spiegelas',
    generate:'Stencil maken', generating:'Stencil wordt gemaakt…', sourcePreview:'BRONVOORBEELD', result:'SALONKLARE STENCIL', transparent:'Transparante PNG',
    stencil:'Stencil PNG', sheet:'Salonwerkblad', share:'Delen / verzenden', empty:'Hier verschijnt de geïsoleerde stencil.', remove:'Afbeelding verwijderen',
    aiSource:'AI-BRONAFBEELDING', uploadedSource:'GEÜPLOADE AFBEELDING', note:'De uitvoer is geïsoleerde 2D tattoo-art. Het salonblad voegt apart registratie- en uitlijnhulpen toe.',
    error:'Stencilgeneratie mislukt.', max:'JPG, PNG of WEBP • max. 10 MB'
  },
};

function t(language:string,key:string){
  const lang=(language in UI?language:'en') as Lang;
  return UI[lang][key] || UI.en[key] || key;
}

function downloadBlob(name:string,blob:Blob){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

async function fileToPreview(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('A kép előnézete nem olvasható.'));
    reader.onerror=()=>reject(new Error('A kép előnézete nem olvasható.'));
    reader.readAsDataURL(file);
  });
}

async function isolateInkPng(url:string,transparent:boolean,threshold:number):Promise<Blob>{
  const response=await fetch(url);
  if(!response.ok) throw new Error('A stencil forrása nem tölthető be.');
  const blob=await response.blob();
  const bitmap=await createImageBitmap(blob);

  const src=document.createElement('canvas');
  src.width=bitmap.width; src.height=bitmap.height;
  const srcCtx=src.getContext('2d'); if(!srcCtx) throw new Error('A képfeldolgozó nem indult.');
  srcCtx.drawImage(bitmap,0,0); bitmap.close();

  const w=src.width,h=src.height,data=srcCtx.getImageData(0,0,w,h).data;
  const mask=new Uint8Array(w*h);
  const minX=Math.floor(w*0.03),maxX=Math.ceil(w*0.97),minY=Math.floor(h*0.015),maxY=Math.ceil(h*0.985);

  for(let y=minY;y<maxY;y++) for(let x=minX;x<maxX;x++){
    const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];
    const lum=0.2126*r+0.7152*g+0.0722*b;
    const chroma=Math.max(r,g,b)-Math.min(r,g,b);
    if(lum<threshold && chroma<48) mask[y*w+x]=1;
  }

  const seen=new Uint8Array(w*h),kept=new Uint8Array(w*h);
  const qx=new Int32Array(w*h),qy=new Int32Array(w*h);
  const neighbors=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  const minComponent=Math.max(16,Math.floor(w*h*0.000002));
  const maxComponent=Math.floor(w*h*0.10);
  const components:Array<{indices:number[];minX:number;minY:number;maxX:number;maxY:number;score:number}>=[];
  const centerX=w/2,centerY=h/2;

  for(let sy=minY;sy<maxY;sy++) for(let sx=minX;sx<maxX;sx++){
    const si=sy*w+sx;
    if(!mask[si]||seen[si]) continue;
    let head=0,tail=0;
    const indices:number[]=[]; let cminX=w,cminY=h,cmaxX=0,cmaxY=0;
    qx[tail]=sx;qy[tail]=sy;tail++;seen[si]=1;
    while(head<tail){
      const x=qx[head],y=qy[head];head++;
      const idx=y*w+x;indices.push(idx);
      if(x<cminX)cminX=x;if(x>cmaxX)cmaxX=x;if(y<cminY)cminY=y;if(y>cmaxY)cmaxY=y;
      for(const [dx,dy] of neighbors){
        const nx=x+dx,ny=y+dy;
        if(nx<minX||nx>=maxX||ny<minY||ny>=maxY) continue;
        const ni=ny*w+nx;
        if(mask[ni]&&!seen[ni]){seen[ni]=1;qx[tail]=nx;qy[tail]=ny;tail++;}
      }
    }
    const size=indices.length;
    if(size<minComponent||size>maxComponent) continue;
    const ccx=(cminX+cmaxX)/2,ccy=(cminY+cmaxY)/2;
    const dist=Math.sqrt(((ccx-centerX)/(w*.50))**2+((ccy-centerY)/(h*.58))**2);
    const border=cminX<=minX+3||cmaxX>=maxX-3||cminY<=minY+2||cmaxY>=maxY-2;
    if(dist>1.08||border) continue;
    const bw=cmaxX-cminX+1,bh=cmaxY-cminY+1;
    const compact=Math.min(1,(size/(bw*bh))*36);
    components.push({indices,minX:cminX,minY:cminY,maxX:cmaxX,maxY:cmaxY,score:size*(1.2-dist*.7+compact*.25)});
  }

  components.sort((a,b)=>b.score-a.score);
  const selected=components.slice(0,18);
  let count=0,minBX=w,minBY=h,maxBX=0,maxBY=0;
  for(const c of selected){
    for(const idx of c.indices) kept[idx]=1;
    count+=c.indices.length;
    if(c.minX<minBX)minBX=c.minX;if(c.minY<minBY)minBY=c.minY;
    if(c.maxX>maxBX)maxBX=c.maxX;if(c.maxY>maxBY)maxBY=c.maxY;
  }
  if(!count) throw new Error('Nem sikerült tisztán izolálni a tattoo motívumot.');

  const pad=Math.max(18,Math.round(Math.min(w,h)*0.035));
  const bx0=Math.max(0,minBX-pad),by0=Math.max(0,minBY-pad),bx1=Math.min(w,maxBX+pad+1),by1=Math.min(h,maxBY+pad+1);
  const outW=bx1-bx0,outH=by1-by0;
  const canvas=document.createElement('canvas');canvas.width=outW;canvas.height=outH;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('A stencil kimenet nem indult.');
  const out=ctx.createImageData(outW,outH);

  for(let y=0;y<outH;y++) for(let x=0;x<outW;x++){
    const si=(by0+y)*w+(bx0+x),di=(y*outW+x)*4,ink=kept[si]===1;
    const v=ink?0:255;
    out.data[di]=v;out.data[di+1]=v;out.data[di+2]=v;out.data[di+3]=transparent?(ink?255:0):255;
  }
  ctx.putImageData(out,0,0);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(
    b=>b?resolve(b):reject(new Error('Stencil PNG export hiba.')),'image/png'
  ));
}

async function guideSheet(blob:Blob,opts:{grid:boolean;center:boolean;mirror:boolean}):Promise<Blob>{
  const bitmap=await createImageBitmap(blob); const w=bitmap.width,h=bitmap.height;
  const marginX=Math.max(180,Math.round(w*0.20)),marginY=Math.max(180,Math.round(h*0.16));
  const W=w+marginX*2,H=h+marginY*2;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('A munkalap export nem indult.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  const frameX=marginX,frameY=marginY;
  ctx.drawImage(bitmap,frameX,frameY);bitmap.close();

  ctx.save();
  ctx.strokeStyle='#333';ctx.fillStyle='#333';ctx.lineWidth=2;ctx.setLineDash([]);
  ctx.strokeRect(frameX,frameY,w,h);

  const crop=42,gap=12;
  for(const [x,y,sx,sy] of [[frameX,frameY,1,1],[frameX+w,frameY,-1,1],[frameX,frameY+h,1,-1],[frameX+w,frameY+h,-1,-1]] as Array<[number,number,number,number]>){
    ctx.beginPath();ctx.moveTo(x+sx*gap,y);ctx.lineTo(x+sx*(gap+crop),y);ctx.moveTo(x,y+sy*gap);ctx.lineTo(x,y+sy*(gap+crop));ctx.stroke();
  }

  const cross=(cx:number,cy:number)=>{
    const size=Math.max(24,Math.round(Math.min(W,H)*0.016)),ring=Math.max(6,Math.round(size*.22));
    ctx.beginPath();ctx.moveTo(cx-size,cy);ctx.lineTo(cx+size,cy);ctx.moveTo(cx,cy-size);ctx.lineTo(cx,cy+size);ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,ring,0,Math.PI*2);ctx.stroke();
  };
  const off=Math.max(60,Math.round(Math.min(marginX,marginY)*.52));
  cross(frameX-off,frameY-off);cross(frameX+w+off,frameY-off);cross(frameX-off,frameY+h+off);cross(frameX+w+off,frameY+h+off);

  ctx.lineWidth=1.5;
  if(opts.center){ctx.setLineDash([14,10]);ctx.beginPath();ctx.moveTo(frameX,H/2);ctx.lineTo(frameX+w,H/2);ctx.stroke();ctx.beginPath();ctx.moveTo(W/2,frameY);ctx.lineTo(W/2,frameY+h);ctx.stroke();}
  if(opts.mirror){ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(W/2-5,frameY);ctx.lineTo(W/2-5,frameY+h);ctx.stroke();ctx.beginPath();ctx.moveTo(W/2+5,frameY);ctx.lineTo(W/2+5,frameY+h);ctx.stroke();}
  if(opts.grid){
    ctx.setLineDash([]);ctx.strokeStyle='rgba(60,60,60,.16)';ctx.lineWidth=1;
    for(let i=1;i<10;i++){const x=frameX+w*i/10,y=frameY+h*i/10;ctx.beginPath();ctx.moveTo(x,frameY);ctx.lineTo(x,frameY+h);ctx.stroke();ctx.beginPath();ctx.moveTo(frameX,y);ctx.lineTo(frameX+w,y);ctx.stroke();}
  }

  ctx.setLineDash([]);ctx.fillStyle='#222';ctx.textAlign='left';
  ctx.font='700 '+Math.max(18,Math.round(Math.min(W,H)*.018))+'px sans-serif';
  ctx.fillText('DESIGNLY TATTOO · STENCIL MASTER',Math.max(24,Math.round(marginX*.20)),Math.max(40,Math.round(marginY*.30)));
  ctx.font='500 '+Math.max(10,Math.round(Math.min(W,H)*.009))+'px sans-serif';
  ctx.fillText('PRINT 100% · DO NOT FIT TO PAGE · REGISTRATION MARKS · ALIGNMENT GUIDES',Math.max(24,Math.round(marginX*.20)),Math.max(60,Math.round(marginY*.48)));

  const bar=Math.max(120,Math.round(W*.08)),bx=W-bar-Math.max(24,Math.round(marginX*.20)),by=H-Math.max(24,Math.round(marginY*.28));
  ctx.textAlign='right';ctx.font='500 '+Math.max(10,Math.round(Math.min(W,H)*.008))+'px sans-serif';ctx.fillText('REFERENCE 50 mm',bx+bar,by-10);
  ctx.strokeStyle='#222';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+bar,by);ctx.stroke();ctx.beginPath();ctx.moveTo(bx,by-8);ctx.lineTo(bx,by+8);ctx.stroke();ctx.beginPath();ctx.moveTo(bx+bar,by-8);ctx.lineTo(bx+bar,by+8);ctx.stroke();
  ctx.restore();

  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Munkalap export hiba.')),'image/png'));
}

export default function TattooStudio({language='hu'}:{language?:string}){
  const [sourceMode,setSourceMode]=useState<SourceMode>('upload');
  const [file,setFile]=useState<File|null>(null);
  const [sourcePreview,setSourcePreview]=useState<string|null>(null);
  const [concept,setConcept]=useState('Kelta fonatos koszorú, Odin két hollója, önálló fekete tattoo vonalmunka, tiszta negatív tér.');
  const [format,setFormat]=useState<Format>('portrait');
  const [inkLevel,setInkLevel]=useState(145);
  const [removeBody,setRemoveBody]=useState(true);
  const [grid,setGrid]=useState(true),[center,setCenter]=useState(true),[mirror,setMirror]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [resultUrl,setResultUrl]=useState<string|null>(null);
  const [transparent,setTransparent]=useState<Blob|null>(null),[stencil,setStencil]=useState<Blob|null>(null),[sheet,setSheet]=useState<Blob|null>(null);

  const ratio=format==='portrait'?'2:3':format==='landscape'?'3:2':'1:1';

  async function setSource(next:File){
    if(!/^image\/(png|jpe?g|webp)$/i.test(next.type)) { setError(t(language,'max')); return; }
    if(next.size>10*1024*1024) { setError(t(language,'max')); return; }
    setFile(next); setSourcePreview(await fileToPreview(next)); setError('');
    setResultUrl(null);setTransparent(null);setStencil(null);setSheet(null);
  }

  async function chooseFile(e:ChangeEvent<HTMLInputElement>){ if(e.target.files?.[0]) await setSource(e.target.files[0]); }
  async function dropFile(e:DragEvent<HTMLLabelElement>){ e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f) await setSource(f); }

  async function generate(){
    if(busy) return;
    if(sourceMode==='upload'&&!file){setError(t(language,'uploadHint'));return;}
    if(sourceMode==='ai'&&!concept.trim()){setError(t(language,'error'));return;}
    setBusy(true);setError('');setResultUrl(null);setTransparent(null);setStencil(null);setSheet(null);
    try{
      let workingUrl='';
      if(sourceMode==='upload'){
        const edited=await editCreativeImage({
          files:[file!],
          prompt:(removeBody?'Convert the uploaded image into a PURE 2D TATTOO STENCIL. Remove ALL skin, arm, leg, hand, shoulder, chest, torso, face, person, clothing, body, background, poster, frame, scenery, props and mockup elements. ': 'Do not create a body mockup. ')
            +'Keep ONLY the tattoo motif. No 3D, no photorealism, no cinematic lighting, no shadows, no gradients. Reconstruct as clean black tattoo linework with crisp outer contours, controlled solid black stencil areas, clean negative space and traceable shapes. No text unless the requested letter is part of the tattoo motif. Plain white background only.',
          aspectRatio:ratio,resolution:'1k'
        });
        workingUrl=edited.url;
      }else{
        const generated=await generateCreativeImage([
          'PURE 2D TATTOO STENCIL ARTWORK ONLY.',
          'Create exactly ONE standalone tattoo motif centered on a plain white background.',
          'NO body, skin, arm, leg, hand, shoulder, chest, torso, face, person, mannequin or clothing.',
          'NO poster, paper, mockup, scenery, environment, frame, border or props.',
          'NO 3D, no photorealism, no perspective, no cinematic lighting, no shadows, no gradients.',
          'Flat black tattoo linework, clean contour hierarchy, solid stencil areas, white negative space, connected traceable shapes.',
          'No presentation text, captions, logos or watermark. A requested monogram may be an integral part of the tattoo motif.',
          'Concept: '+concept.trim()
        ].join(' '),ratio);
        workingUrl=generated.url;
      }

      const alpha=await isolateInkPng(workingUrl,true,inkLevel);
      const st=await isolateInkPng(workingUrl,false,inkLevel);
      const sh=await guideSheet(st,{grid,center,mirror});
      setTransparent(alpha);setStencil(st);setSheet(sh);setResultUrl(URL.createObjectURL(alpha));
    }catch(e){
      setError(e instanceof Error?e.message:t(language,'error'));
    }finally{setBusy(false);}
  }

  async function share(blob:Blob,name:string){
    try{
      const fileToShare=new File([blob],name,{type:'image/png'});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[fileToShare]}))){
        await navigator.share({title:'Designly Tattoo Stencil',text:'Szalonra kész 2D tattoo stencil',files:[fileToShare]});return;
      }
      downloadBlob(name,blob);
    }catch(e){if(e instanceof DOMException&&e.name==='AbortError')return;downloadBlob(name,blob);}
  }

  return <section className='space-y-5'>
    <div className='rounded-2xl border border-accent/25 bg-accent/5 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div><div className='text-xs font-semibold text-ink-100'>{t(language,'title')}</div><p className='mt-1 text-xs text-ink-400'>{t(language,'desc')}</p></div>
        <span className='rounded-full border border-emerald-500/30 px-3 py-1 text-[10px] text-emerald-300'>2D STENCIL</span>
      </div>
    </div>

    <div className='grid gap-4 lg:grid-cols-[1fr_1.05fr]'>
      <div className='space-y-4 rounded-2xl border border-line bg-canvas/50 p-4'>
        <div className='flex gap-2 rounded-xl border border-line bg-black/30 p-1'>
          <button type='button' onClick={()=>setSourceMode('upload')} className={'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs '+(sourceMode==='upload'?'bg-accent/15 text-accent':'text-ink-300')}><Upload className='h-4 w-4'/>{t(language,'upload')}</button>
          <button type='button' onClick={()=>setSourceMode('ai')} className={'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs '+(sourceMode==='ai'?'bg-accent/15 text-accent':'text-ink-300')}><Sparkles className='h-4 w-4'/>{t(language,'ai')}</button>
        </div>

        {sourceMode==='upload'?(
          <div className='space-y-3'>
            <label onDragOver={e=>e.preventDefault()} onDrop={dropFile} className='flex min-h-[210px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-accent/40 bg-black/30 p-6 text-center hover:border-accent/70'>
              <input type='file' accept='image/png,image/jpeg,image/webp' className='hidden' onChange={chooseFile}/>
              <ImagePlus className='mb-3 h-10 w-10 text-accent'/><div className='text-sm font-medium text-ink-100'>{t(language,'uploadHint')}</div><div className='mt-2 text-[10px] text-ink-500'>{t(language,'max')}</div>
            </label>
            {file&&<div className='flex items-center justify-between rounded-xl border border-line bg-black/30 p-3'><div className='flex items-center gap-2 text-xs text-ink-300'><FileImage className='h-4 w-4 text-accent'/><span className='max-w-[280px] truncate'>{file.name}</span></div><button type='button' onClick={()=>{setFile(null);setSourcePreview(null);}} className='text-[11px] text-ink-500 hover:text-ink-200'>{t(language,'remove')}</button></div>}
          </div>
        ):(
          <label className='block text-xs text-ink-400'>{t(language,'concept')}
            <textarea rows={8} className='vp-input mt-1' value={concept} onChange={e=>setConcept(e.target.value)} placeholder={t(language,'conceptPlaceholder')}/>
          </label>
        )}

        <div className='grid gap-3 sm:grid-cols-2'>
          <label className='text-xs text-ink-400'>{t(language,'formats')}
            <select className='vp-input mt-1' value={format} onChange={e=>setFormat(e.target.value as Format)}>
              <option value='portrait'>{t(language,'portrait')}</option><option value='square'>{t(language,'square')}</option><option value='landscape'>{t(language,'landscape')}</option>
            </select>
          </label>
          <label className='text-xs text-ink-400'>{t(language,'ink')}
            <select className='vp-input mt-1' value={inkLevel} onChange={e=>setInkLevel(Number(e.target.value))}>
              <option value='110'>{t(language,'fine')}</option><option value='145'>{t(language,'standard')}</option><option value='175'>{t(language,'bold')}</option>
            </select>
          </label>
        </div>

        <div className='rounded-xl border border-line bg-black/20 p-3'>
          <label className='flex items-center gap-3 text-xs text-ink-300'><input type='checkbox' checked={removeBody} onChange={e=>setRemoveBody(e.target.checked)}/><span>{t(language,'removeBody')}</span></label>
          <p className='mt-1 pl-6 text-[10px] text-ink-500'>{t(language,'removeBodyHint')}</p>
        </div>

        <div>
          <div className='mb-2 text-xs text-ink-400'>{t(language,'guides')}</div>
          <div className='flex flex-wrap gap-2'>
            <button type='button' onClick={()=>setGrid(v=>!v)} className={'rounded-full border px-3 py-1.5 text-xs '+(grid?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{t(language,'grid')}</button>
            <button type='button' onClick={()=>setCenter(v=>!v)} className={'rounded-full border px-3 py-1.5 text-xs '+(center?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{t(language,'center')}</button>
            <button type='button' onClick={()=>setMirror(v=>!v)} className={'rounded-full border px-3 py-1.5 text-xs '+(mirror?'border-accent/70 bg-accent/15 text-accent':'border-line text-ink-300')}>{t(language,'mirror')}</button>
          </div>
        </div>

        <button type='button' onClick={generate} disabled={busy} className='vp-btn w-full'>
          {busy?<Sparkles className='h-4 w-4 animate-pulse'/>:<PenTool className='h-4 w-4'/>}
          {busy?t(language,'generating'):t(language,'generate')}
        </button>
        {error&&<p className='rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300'>{error}</p>}
      </div>

      <div className='rounded-2xl border border-line bg-black p-4'>
        <div className='mb-3 flex items-center justify-between text-xs text-ink-400'><span>{t(language,'result')}</span><span>{resultUrl?'ISOLATED · 2D':'—'}</span></div>
        <div className='relative min-h-[560px] overflow-hidden rounded-2xl border border-line' style={{backgroundImage:'linear-gradient(45deg,#171717 25%,transparent 25%),linear-gradient(-45deg,#171717 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#171717 75%),linear-gradient(-45deg,transparent 75%,#171717 75%)',backgroundSize:'28px 28px',backgroundPosition:'0 0,0 14px,14px -14px,-14px 0'}}>
          {resultUrl?<div className='flex h-full min-h-[560px] items-center justify-center p-6'><img src={resultUrl} alt='Isolated tattoo stencil' className='max-h-[620px] max-w-full object-contain'/></div>:<div className='flex min-h-[560px] flex-col items-center justify-center text-center text-sm text-ink-500'><Layers3 className='mb-3 h-10 w-10'/>{t(language,'empty')}</div>}
        </div>

        {(sourcePreview||resultUrl)&&<div className='mt-4 grid gap-3 sm:grid-cols-2'>
          {sourcePreview&&<div className='rounded-xl border border-line bg-canvas/30 p-2'><div className='mb-2 text-[10px] tracking-widest text-ink-500'>{t(language,'uploadedSource')}</div><img src={sourcePreview} alt='Uploaded source' className='max-h-48 w-full object-contain'/></div>}
          {resultUrl&&<div className='rounded-xl border border-line bg-white p-2'><div className='mb-2 text-[10px] tracking-widest text-black/60'>{t(language,'result')}</div><img src={resultUrl} alt='Stencil result' className='max-h-48 w-full object-contain'/></div>}
        </div>}

        {transparent&&stencil&&<div className='mt-4 grid gap-2 sm:grid-cols-2'>
          <button type='button' className='vp-btn' onClick={()=>downloadBlob('designly-tattoo-transparent.png',transparent)}><Download className='h-4 w-4'/>{t(language,'transparent')}</button>
          <button type='button' className='vp-btn' onClick={()=>downloadBlob('designly-tattoo-stencil.png',stencil)}><Download className='h-4 w-4'/>{t(language,'stencil')}</button>
          <button type='button' className='vp-btn-ghost' onClick={()=>sheet&&downloadBlob('designly-tattoo-salon-sheet.png',sheet)}><Grid3X3 className='h-4 w-4'/>{t(language,'sheet')}</button>
          <button type='button' className='vp-btn-ghost' onClick={()=>share(stencil,'designly-tattoo-stencil.png')}><Share2 className='h-4 w-4'/>{t(language,'share')}</button>
        </div>}

        <p className='mt-3 text-[10px] text-ink-500'>{t(language,'note')}</p>
      </div>
    </div>
  </section>;
}
