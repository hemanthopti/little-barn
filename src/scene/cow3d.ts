/**
 * Native WebGL2 3D renderer for Little Barn's Cow Care room.
 * Geometry, lighting and animated transforms are computed on the GPU.
 * No network imports: works with the existing offline PWA.
 */
export type Activity = 'pet'|'brush'|'wash'|'apple'|'milk'|'sleep';
type Vec = [number,number,number];
const eye:Vec=[0,2.9,7.8];
function product(a:number[],b:number[]){const o=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
const ident=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const tr=(x:number,y:number,z:number)=>{const a=ident();a[12]=x;a[13]=y;a[14]=z;return a;};
const sc=(x:number,y:number,z:number)=>[x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1];
const rot=(t:number)=>{const c=Math.cos(t),s=Math.sin(t);return [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]};
function camera(aspect:number){const f=1/Math.tan(.39),n=.1,z=60,target:Vec=[0,1.48,0];const zz:Vec=[eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]],l=Math.hypot(...zz);zz.forEach((v,i)=>zz[i]=v/l);const xx:Vec=[zz[2],0,-zz[0]],yy:Vec=[zz[1]*xx[2]-zz[2]*xx[1],zz[2]*xx[0]-zz[0]*xx[2],zz[0]*xx[1]-zz[1]*xx[0]];const v=[xx[0],yy[0],zz[0],0,xx[1],yy[1],zz[1],0,xx[2],yy[2],zz[2],0,-xx[0]*eye[0]-xx[1]*eye[1]-xx[2]*eye[2],-yy[0]*eye[0]-yy[1]*eye[1]-yy[2]*eye[2],-zz[0]*eye[0]-zz[1]*eye[1]-zz[2]*eye[2],1];return product([f/aspect,0,0,0,0,f,0,0,0,0,(z+n)/(n-z),-1,0,0,2*z*n/(n-z),0],v)}
type Part={n:string;p:number[];s:number[];c:number[];spot?:boolean};
const white:Vec=[.99,.96,.89],dark:Vec=[.23,.18,.16],pink:Vec=[1,.6,.62],brown:Vec=[.36,.22,.16],horn:Vec=[1,.87,.58];
const parts:Part[]=[
{n:'body',p:[.22,1.35,-.18],s:[1.3,.85,.78],c:white,spot:true},
{n:'chest',p:[-.64,1.42,.2],s:[.68,.77,.66],c:white},
...([[-.6,.48],[1.02,.48],[-.6,-.5],[1.02,-.5]] as [number,number][]).flatMap(([x,z],i)=>[
 {n:'leg'+i,p:[x,.67,z],s:[.24,.63,.24],c:white},
 {n:'hoof'+i,p:[x,.2,z+.07],s:[.25,.2,.27],c:brown}
]),
{n:'udder',p:[.48,.66,.12],s:[.42,.25,.28],c:pink},
{n:'head',p:[-.74,2.17,.45],s:[.78,.8,.68],c:white},
{n:'patch',p:[-.34,2.36,1.02],s:[.37,.43,.15],c:dark},
{n:'earL',p:[-1.39,2.38,.29],s:[.45,.2,.28],c:dark},
{n:'earR',p:[-.03,2.38,.29],s:[.45,.2,.28],c:dark},
{n:'earPinkL',p:[-1.41,2.39,.51],s:[.31,.13,.08],c:pink},
{n:'earPinkR',p:[-.03,2.39,.51],s:[.31,.13,.08],c:pink},
{n:'hornL',p:[-1.19,2.91,.31],s:[.16,.29,.15],c:horn},
{n:'hornR',p:[-.24,2.93,.31],s:[.16,.3,.15],c:horn},
{n:'hairL',p:[-.95,2.92,.56],s:[.29,.19,.2],c:brown},
{n:'hairR',p:[-.57,2.92,.58],s:[.29,.22,.22],c:brown},
{n:'muzzle',p:[-.74,1.86,1.05],s:[.7,.43,.38],c:pink},
{n:'noseL',p:[-1.05,1.98,1.38],s:[.09,.11,.04],c:[.75,.3,.35]},
{n:'noseR',p:[-.42,1.98,1.38],s:[.09,.11,.04],c:[.75,.3,.35]},
{n:'smile',p:[-.74,1.64,1.39],s:[.24,.045,.024],c:[.62,.23,.26]},
...([-1.11,-.32]).flatMap((x,i)=>[
 {n:'eyeWhite'+i,p:[x,2.39,1.05],s:[.23,.29,.14],c:[1,1,1] as Vec},
 {n:'iris'+i,p:[x+.03,2.38,1.19],s:[.15,.20,.045],c:[.53,.29,.14] as Vec},
 {n:'pupil'+i,p:[x+.035,2.38,1.225],s:[.09,.14,.023],c:[.11,.07,.06] as Vec},
 {n:'shine'+i,p:[x-.005,2.45,1.247],s:[.04,.05,.014],c:[1,1,1] as Vec}
]),
{n:'tail',p:[1.59,1.33,-.2],s:[.13,.43,.12],c:white},
{n:'tailTip',p:[1.78,1.02,-.2],s:[.23,.28,.19],c:brown}
];
const vs=`#version 300 es
layout(location=0)in vec3 position;layout(location=1)in vec3 normal;
uniform mat4 model,viewProj;uniform vec3 eye;
out vec3 N,V,P;
void main(){vec4 w=model*vec4(position,1.);N=mat3(transpose(inverse(model)))*normal;V=eye-w.xyz;P=position;gl_Position=viewProj*w;}`;
const fs=`#version 300 es
precision highp float;
in vec3 N,V,P;uniform vec3 color;uniform float spot,opacity;out vec4 outColor;
float patch(vec3 p,vec3 center,vec3 rad){vec3 d=(p-center)/rad;return 1.-smoothstep(.75,1.1,dot(d,d));}
void main(){vec3 n=normalize(N),l=normalize(vec3(-.55,.85,1.));
vec3 base=color;
if(spot>.5){float x=max(max(patch(P,vec3(.7,.55,.8),vec3(.34,.44,.46)),patch(P,vec3(.85,-.5,.5),vec3(.33,.43,.48))),patch(P,vec3(-.24,-.68,.56),vec3(.26,.35,.39)));base=mix(base,vec3(.24,.18,.16),x);}
float diffuse=max(dot(n,l),0.);float spec=pow(max(dot(n,normalize(l+normalize(V))),0.),42.);
vec3 col=base*(vec3(.45,.49,.57)+vec3(.76,.69,.55)*diffuse)+vec3(spec*.28);
outColor=vec4(col,opacity);}`;
function shader(gl:WebGL2RenderingContext,type:number,source:string){const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader');return s;}
export class Cow3D{
 private gl:WebGL2RenderingContext;private program:WebGLProgram;private vao:WebGLVertexArrayObject;private num=0;private locations:Record<string,WebGLUniformLocation>={};private running=false;private frame=0;private time=0;private last=0;private action:Activity|null=null;private actionEnd=0;
 private drops:{p:Vec;v:Vec;c:Vec;ttl:number;size:number}[]=[];
 milk=0;clean=0;onLost?:()=>void;
 constructor(private canvas:HTMLCanvasElement){
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true});if(!gl)throw Error('WebGL2 not supported');this.gl=gl;
  const p=gl.createProgram()!;gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('WebGL link failed');this.program=p;
  for(const k of ['model','viewProj','eye','color','spot','opacity'])this.locations[k]=gl.getUniformLocation(p,k)!;
  const vertices:number[]=[],indices:number[]=[];const rows=28,cols=36;
  for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const a=Math.PI*i/rows,b=2*Math.PI*j/cols,x=Math.sin(a)*Math.cos(b),y=Math.cos(a),z=Math.sin(a)*Math.sin(b);vertices.push(x,y,z,x,y,z)}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const k=i*(cols+1)+j,l=k+cols+1;indices.push(k,l,k+1,k+1,l,l+1)}
  this.num=indices.length;this.vao=gl.createVertexArray()!;gl.bindVertexArray(this.vao);
  const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);gl.bindVertexArray(null);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.stop();this.onLost?.()},{once:true});
 }
 start(){if(this.running)return;this.running=true;this.last=performance.now();this.frame=requestAnimationFrame(this.step);}
 stop(){this.running=false;cancelAnimationFrame(this.frame);}
 act(a:Activity){this.action=a;this.actionEnd=performance.now()+(a==='sleep'?6000:a==='wash'?2500:1600);if(a==='wash')this.clean=Math.min(1,this.clean+.2);if(a==='milk')this.milk=Math.min(1,this.milk+.25);let count=a==='wash'?100:a==='milk'?38:22;for(let i=0;i<count;i++){const water=a==='wash',isMilk=a==='milk';this.drops.push({p:[(isMilk?1:water?0:-.7)+(Math.random()-.5)*1.1,water?3.35:isMilk?1.14:2.25,Math.random()*.5+.75],v:[(Math.random()-.5)*1.2,water?-1.7-Math.random():isMilk?-1.5:Math.random()*1.2+.25,0],c:water?[.5,.86,1]:isMilk?[1,1,.94]:a==='brush'?[1,.85,.36]:[1,.53,.65],ttl:.45+Math.random()*1.1,size:.028+Math.random()*.045});}}
 private step=(now:number)=>{if(!this.running)return;const dt=Math.min(.05,(now-this.last)/1000);this.last=now;this.time+=dt;this.render(now,dt);this.frame=requestAnimationFrame(this.step);};
 private draw(p:Vec,s:Vec,c:Vec,angle=0,spots=false,alpha=1){const gl=this.gl;const m=product(tr(...p),product(rot(angle),sc(...s)));gl.uniformMatrix4fv(this.locations.model,false,new Float32Array(m));gl.uniform3fv(this.locations.color,c);gl.uniform1f(this.locations.spot,spots?1:0);gl.uniform1f(this.locations.opacity,alpha);gl.drawElements(gl.TRIANGLES,this.num,gl.UNSIGNED_SHORT,0);}
 private render(now:number,dt:number){const gl=this.gl,w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
 const dpr=Math.min(devicePixelRatio||1,2),pw=Math.ceil(w*dpr),ph=Math.ceil(h*dpr);if(this.canvas.width!==pw||this.canvas.height!==ph){this.canvas.width=pw;this.canvas.height=ph;}
 gl.viewport(0,0,pw,ph);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.uniformMatrix4fv(this.locations.viewProj,false,new Float32Array(camera(w/h)));gl.uniform3fv(this.locations.eye,eye);
 const active=now<this.actionEnd,a=active?this.action:null,t=this.time,blink=a==='sleep'?.1:(t%4.9>4.72?.1:1),wiggle=a==='pet'||a==='brush'?Math.sin(t*14)*.09:0,bob=a==='sleep'?-.27:Math.sin(t*2)*.018+(a==='apple'?.045*Math.sin(t*10):0);
 for(const part of parts){const p=[...part.p] as Vec,s=[...part.s] as Vec;let ang=0;
 if(part.n==='body')s[1]*=1+.013*Math.sin(t*2);
 if(part.n==='tail'||part.n==='tailTip')ang=.2*Math.sin(t*3);
 if(part.n.startsWith('ear'))ang=.12*Math.sin(t*4);
 if(part.n==='head'||part.n.startsWith('ear')||part.n.startsWith('horn')||part.n.startsWith('hair')||part.n==='muzzle'||part.n.startsWith('eye')||part.n.startsWith('iris')||part.n.startsWith('pupil')||part.n.startsWith('shine')||part.n.startsWith('nose')||part.n==='patch'||part.n==='smile'){p[1]+=wiggle;ang+=wiggle*.55}
 if(part.n.startsWith('eye')||part.n.startsWith('iris')||part.n.startsWith('pupil')||part.n.startsWith('shine'))s[1]*=blink;
 p[1]+=bob;if(a==='sleep'){p[1]-=.16;s[1]*=.94}
 this.draw(p as Vec,s as Vec,part.c as Vec,ang,!!part.spot);
 }
 // Milk bucket and glossy milk filling.
 this.draw([1.77,.48,1.05],[.39,.43,.37],[.63,.77,.85]);this.draw([1.77,.86,1.05],[.4,.055,.38],[.91,.96,1]);if(this.milk)this.draw([1.77,.89,1.05],[.31,.04,.3],[1,1,.94]);
 if(a==='apple'){const f=1-Math.max(0,(this.actionEnd-now))/1600;this.draw([-1.9+1.2*f,1.05+.9*f,1.35],[.19*(1-.65*f),.2*(1-.65*f),.2*(1-.65*f)],[.91,.06,.13]);}
 for(const d of this.drops){d.ttl-=dt;d.p=[d.p[0]+d.v[0]*dt,d.p[1]+d.v[1]*dt,d.p[2]+d.v[2]*dt];if(d.v[1]<0)d.v[1]-=2*dt;if(d.ttl>0)this.draw(d.p,[d.size,d.size*(d.v[1]<0?1.6:1),d.size],d.c,0,false,Math.min(1,d.ttl));}this.drops=this.drops.filter(x=>x.ttl>0);
 }
}
