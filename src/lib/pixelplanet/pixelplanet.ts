/* ============================================================
   Pixel Planet renderer — raw WebGL port of Deep-Fold's
   Pixel Planet Generator (via Timur310/PixelPlanets, GPL-3.0).
   Each planet = stacked layer shaders drawn on a quad with
   alpha compositing, animated by a shared clock.

   Ported from the design prototype's pixelplanet.js to a TS module:
   the shader sources are verbatim; only the IIFE/window global was
   removed and the GL plumbing made null-safe. Client-only (uses WebGL
   and requestAnimationFrame) — instantiate inside onMount / the browser.
   ============================================================ */

// shared fullscreen-quad vertex shader. vUv spans [-0.5,0.5];
// uScale maps the quad into clip space (body layers slightly inset
// so the atmosphere ring has room at the canvas edge).
const VERT = `
    attribute vec2 aPos;
    varying vec3 vUv;
    uniform float uScale;
    void main(){
      vUv = vec3(aPos, 0.0);
      gl_Position = vec4(aPos * 2.0 * uScale, 0.0, 1.0);
    }`;

const HEAD = 'precision highp float;\n';

// ---- layer fragment shaders (ported verbatim where possible) ----
const BASE_FRAG = `
    varying vec3 vUv;
    uniform float lightIntensity, pixels, rotation, time_speed, seed, time;
    uniform vec2 light_origin;
    uniform vec4 color1, color2, color3;
    float dither_size = 2.0; float light_border_1 = 0.4; float light_border_2 = 0.6;
    float size = 10.0; const int OCTAVES = 20; bool should_dither = true;
    float rand(vec2 coord){ coord = mod(coord, vec2(1.0,1.0)*floor(size+0.5));
      return fract(sin(dot(coord.xy ,vec2(12.9898,78.233))) * 15.5453 * seed); }
    float noise(vec2 coord){ vec2 i=floor(coord); vec2 f=fract(coord);
      float a=rand(i); float b=rand(i+vec2(1.0,0.0)); float c=rand(i+vec2(0.0,1.0)); float d=rand(i+vec2(1.0,1.0));
      vec2 cubic=f*f*(3.0-2.0*f);
      return mix(a,b,cubic.x)+(c-a)*cubic.y*(1.0-cubic.x)+(d-b)*cubic.x*cubic.y; }
    float fbm(vec2 coord){ float value=0.0; float scale=0.5;
      for(int i=0;i<OCTAVES;i++){ value+=noise(coord)*scale; coord*=2.0; scale*=0.5; } return value; }
    bool dither(vec2 uv1, vec2 uv2){ return mod(uv1.x+uv2.y,2.0/pixels) <= 1.0/pixels; }
    vec2 rotate(vec2 coord, float a){ coord-=0.5; coord*=mat2(vec2(cos(a),-sin(a)),vec2(sin(a),cos(a))); return coord+0.5; }
    void main(){
      vec2 uv = (floor(vUv.xy*pixels)/pixels)+0.5;
      float d_circle = distance(uv, vec2(0.5));
      float d_light = distance(uv, vec2(light_origin));
      float a = step(d_circle, 0.49999);
      bool dith = dither(uv, vUv.xy);
      uv = rotate(uv, rotation);
      float fbm1 = fbm(uv);
      d_light += fbm(uv*size+fbm1+vec2(time*0.1+time_speed,0.0))*lightIntensity;
      float dither_border = (1.0/pixels)*dither_size;
      vec4 col = color1;
      if(d_light>light_border_1){ col=color2; if(d_light<light_border_1+dither_border && (dith||!should_dither)) col=color1; }
      if(d_light>light_border_2){ col=color3; if(d_light<light_border_2+dither_border && (dith||!should_dither)) col=color2; }
      gl_FragColor = vec4(col.rgb, a*col.a);
    }`;

const LAND_FRAG = `
    varying vec3 vUv;
    uniform float lightIntensity, pixels, rotation, time_speed, land_cutoff, seed, time;
    uniform vec2 light_origin;
    uniform vec4 col1, col2, col3, col4;
    float light_border_1=0.4; float light_border_2=0.6; float size=10.0; const int OCTAVES=6;
    float rand(vec2 coord){ coord=mod(coord, vec2(1.0,1.0)*floor(size+0.5));
      return fract(sin(dot(coord.xy,vec2(12.9898,78.233)))*15.5453*seed); }
    float noise(vec2 coord){ vec2 i=floor(coord); vec2 f=fract(coord);
      float a=rand(i); float b=rand(i+vec2(1.0,0.0)); float c=rand(i+vec2(0.0,1.0)); float d=rand(i+vec2(1.0,1.0));
      vec2 cubic=f*f*(3.0-2.0*f);
      return mix(a,b,cubic.x)+(c-a)*cubic.y*(1.0-cubic.x)+(d-b)*cubic.x*cubic.y; }
    float fbm(vec2 coord){ float value=0.0; float scale=0.5;
      for(int i=0;i<OCTAVES;i++){ value+=noise(coord)*scale; coord*=2.0; scale*=0.5; } return value; }
    vec2 spherify(vec2 uv){ vec2 c=uv*2.0-1.0; float z=sqrt(1.0-dot(c.xy,c.xy)); vec2 s=c/(z+1.0); return s*0.5+0.5; }
    vec2 rotate(vec2 coord, float a){ coord-=0.5; coord*=mat2(vec2(cos(a),-sin(a)),vec2(sin(a),cos(a))); return coord+0.5; }
    void main(){
      vec2 uv=(floor(vUv.xy*pixels)/pixels)+0.5;
      float d_light = distance(uv, light_origin);
      float d_circle = distance(uv, vec2(0.5));
      float a = step(d_circle, 0.49999);
      uv = rotate(uv, rotation);
      uv = spherify(uv);
      vec2 base_fbm_uv = (uv)*size+vec2(time*time_speed,0.0);
      float fbm1=fbm(base_fbm_uv);
      float fbm2=fbm(base_fbm_uv - light_origin*fbm1);
      float fbm3=fbm(base_fbm_uv - light_origin*1.5*fbm1);
      float fbm4=fbm(base_fbm_uv - light_origin*2.0*fbm1);
      if(d_light<light_border_1){ fbm4*=0.9; }
      if(d_light>light_border_1){ fbm2*=1.05; fbm3*=1.05; fbm4*=1.05; }
      if(d_light>light_border_2){ fbm2*=1.3; fbm3*=1.4; fbm4*=1.8; }
      d_light = pow(d_light,2.0)*0.1;
      vec4 col=col4;
      if(fbm4+d_light<fbm1) col=col3;
      if(fbm3+d_light<fbm1) col=col2;
      if(fbm2+d_light<fbm1) col=col1;
      gl_FragColor = vec4(col.rgb, step(land_cutoff, fbm1)*a*col.a);
    }`;

const CLOUD_FRAG = `
    varying vec3 vUv;
    uniform float pixels, rotation, cloud_cover, time_speed, stretch, seed, time;
    uniform vec2 light_origin;
    uniform vec4 base_color, outline_color, shadow_base_color, shadow_outline_color;
    float cloud_curve=1.3; float light_border_1=0.4; float light_border_2=0.6; float size=4.0; const int OCTAVES=4;
    float rand(vec2 coord){ coord=mod(coord, vec2(1.0,1.0)*floor(size+0.5));
      return fract(sin(dot(coord.xy,vec2(12.9898,78.233)))*15.5453*seed); }
    float noise(vec2 coord){ vec2 i=floor(coord); vec2 f=fract(coord);
      float a=rand(i); float b=rand(i+vec2(1.0,0.0)); float c=rand(i+vec2(0.0,1.0)); float d=rand(i+vec2(1.0,1.0));
      vec2 cubic=f*f*(3.0-2.0*f);
      return mix(a,b,cubic.x)+(c-a)*cubic.y*(1.0-cubic.x)+(d-b)*cubic.x*cubic.y; }
    float fbm(vec2 coord){ float value=0.0; float scale=0.5;
      for(int i=0;i<OCTAVES;i++){ value+=noise(coord)*scale; coord*=2.0; scale*=0.5; } return value; }
    float circleNoise(vec2 uv){ float uv_y=floor(uv.y); uv.x+=uv_y*.31; vec2 f=fract(uv);
      float h=rand(vec2(floor(uv.x),floor(uv_y))); float m=(length(f-0.25-(h*0.5))); float r=h*0.25;
      return smoothstep(0.0,r,m*0.75); }
    float cloud_alpha(vec2 uv){ float c_noise=0.0;
      for(int i=0;i<9;i++){ c_noise += circleNoise((uv*size*0.3)+(float(i+1)+10.)+(vec2(time*time_speed,0.0))); }
      float f=fbm(uv*size+c_noise+vec2(time*time_speed,0.0)); return f; }
    vec2 spherify(vec2 uv){ vec2 c=uv*2.0-1.0; float z=sqrt(1.0-dot(c.xy,c.xy)); vec2 s=c/(z+1.0); return s*0.5+0.5; }
    vec2 rotate(vec2 coord, float a){ coord-=0.5; coord*=mat2(vec2(cos(a),-sin(a)),vec2(sin(a),cos(a))); return coord+0.5; }
    void main(){
      vec2 uv=(floor(vUv.xy*pixels)/pixels)+0.5;
      float d_light=distance(uv, light_origin);
      float d_circle=distance(uv, vec2(0.5));
      float a=step(d_circle,0.5);
      float d_to_center=distance(uv, vec2(0.5));
      uv=rotate(uv, rotation);
      uv=spherify(uv);
      uv.y += smoothstep(0.0, cloud_curve, abs(uv.x-0.4));
      float c=cloud_alpha(uv*vec2(1.0, stretch));
      vec4 col=base_color;
      if(c<cloud_cover+0.03) col=outline_color;
      if(d_light+c*0.2>light_border_1) col=shadow_base_color;
      if(d_light+c*0.2>light_border_2) col=shadow_outline_color;
      c*=step(d_to_center,0.5);
      gl_FragColor=vec4(col.rgb, step(cloud_cover,c)*a*col.a);
    }`;

const CRATER_FRAG = `
    varying vec3 vUv;
    float pixels=100.0;
    uniform float rotation, time_speed, seed, time;
    uniform vec2 light_origin;
    uniform vec4 color1, color2;
    float light_border=0.4; float size=5.0;
    float rand(vec2 coord){ coord=mod(coord, vec2(1.0,1.0)*floor(size+0.5));
      return fract(sin(dot(coord.xy,vec2(12.9898,78.233)))*15.5453*seed); }
    float circleNoise(vec2 uv){ float uv_y=floor(uv.y); uv.x+=uv_y*.31; vec2 f=fract(uv);
      float h=rand(vec2(floor(uv.x),floor(uv_y))); float m=(length(f-0.25-(h*0.5))); float r=h*0.25;
      return smoothstep(r-.10*r,r,m); }
    float crater(vec2 uv){ float c=1.0; for(int i=0;i<2;i++){ c*=circleNoise((uv*size)+(float(i+1)+10.)+vec2((time*0.1)+time_speed,0.0)); } return 1.0-c; }
    vec2 spherify(vec2 uv){ vec2 c=uv*2.0-1.0; float z=sqrt(1.0-dot(c.xy,c.xy)); vec2 s=c/(z+1.0); return s*0.5+0.5; }
    vec2 rotate(vec2 coord, float a){ coord-=0.5; coord*=mat2(vec2(cos(a),-sin(a)),vec2(sin(a),cos(a))); return coord+0.5; }
    void main(){
      vec2 uv=(floor(vUv.xy*pixels)/pixels)+0.5;
      float d_circle=distance(uv, vec2(0.5));
      float d_light=distance(uv, vec2(light_origin));
      float a=step(d_circle,0.49999);
      uv=rotate(uv, rotation); uv=spherify(uv);
      float c1=crater(uv); float c2=crater(uv+(light_origin-0.5)*0.04);
      vec4 col=color1;
      a*=step(0.5,c1);
      if(c2<c1-(0.5-d_light)*2.0) col=color2;
      if(d_light>light_border) col=color2;
      a*=step(d_circle,0.5);
      gl_FragColor=vec4(col.rgb, a*col.a);
    }`;

const RIVER_FRAG = `
    varying vec3 vUv;
    float pixels=100.0;
    uniform float rotation, time_speed, river_cutoff, seed, time;
    uniform vec2 light_origin;
    uniform vec4 color1, color2, color3;
    float light_border_1=0.4; float light_border_2=0.6; float size=10.0; const int OCTAVES=5;
    float rand(vec2 coord){ coord=mod(coord, vec2(2.0,1.0)*floor(size+0.5));
      return fract(sin(dot(coord.xy,vec2(12.9898,78.233)))*15.5453*seed); }
    float noise(vec2 coord){ vec2 i=floor(coord); vec2 f=fract(coord);
      float a=rand(i); float b=rand(i+vec2(1.0,0.0)); float c=rand(i+vec2(0.0,1.0)); float d=rand(i+vec2(1.0,1.0));
      vec2 cubic=f*f*(3.0-2.0*f);
      return mix(a,b,cubic.x)+(c-a)*cubic.y*(1.0-cubic.x)+(d-b)*cubic.x*cubic.y; }
    float fbm(vec2 coord){ float value=0.0; float scale=0.5;
      for(int i=0;i<OCTAVES;i++){ value+=noise(coord)*scale; coord*=2.0; scale*=0.5; } return value; }
    vec2 rotate(vec2 coord, float a){ coord-=0.5; coord*=mat2(vec2(cos(a),-sin(a)),vec2(sin(a),cos(a))); return coord+0.5; }
    vec2 spherify(vec2 uv){ vec2 c=uv*2.0-1.0; float z=sqrt(1.0-dot(c.xy,c.xy)); vec2 s=c/(z+1.0); return s*0.5+0.5; }
    void main(){
      vec2 uv=(floor(vUv.xy*pixels)/pixels)+0.5;
      float d_light=distance(uv, light_origin);
      float d_circle=distance(uv, vec2(0.5));
      float a=step(d_circle,0.49999);
      uv=rotate(uv, rotation); uv=spherify(uv);
      float fbm1=fbm(uv*size+vec2(time*time_speed,0.0));
      float river_fbm=fbm(uv+fbm1*2.5);
      river_fbm=step(river_cutoff, river_fbm);
      vec4 col=color1;
      if(d_light>light_border_1) col=color2;
      if(d_light>light_border_2) col=color3;
      a*=step(river_cutoff, river_fbm);
      gl_FragColor=vec4(col.rgb, a*col.a);
    }`;

// atmosphere — local var renamed to avoid the self-referential `color` bug
const ATMO_FRAG = `
    varying vec3 vUv;
    uniform vec4 color, color2, color3;
    float pixels=100.0;
    void main(){
      vec2 uv=(floor(vUv.xy*pixels)/pixels)+0.5;
      vec2 pos_ndc=2.0*uv.xy-1.0;
      float dist=length(pos_ndc);
      float step0=0.65; float step1=0.87; float step2=0.97; float step3=1.04; float step4=1.04;
      vec4 result=mix(vec4(0,0,0,0), color, smoothstep(step0, step1, dist));
      result=mix(result, color2, smoothstep(step1, step2, dist));
      result=mix(result, color3, smoothstep(step2, step3, dist));
      result=mix(result, vec4(0,0,0,0), smoothstep(step3, step4, dist));
      gl_FragColor=result;
    }`;

const STAR_FRAG = `
    varying vec3 vUv;
    uniform float pixels, time_speed, time, rotation, seed;
    float size = 15.0; float TILES = 2.0; bool should_dither = true;
    float rand(vec2 co){ co=mod(co, vec2(1.0,1.0)*floor(size+0.5)); return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*15.5453*seed); }
    vec2 rotate(vec2 v,float a){ v-=0.5; v*=mat2(vec2(cos(a),-sin(a)),vec2(sin(a),cos(a))); v+=0.5; return v; }
    vec2 Hash2(vec2 p){ float r=523.0*sin(dot(p,vec2(53.3158,43.6143))); return vec2(fract(15.32354*r),fract(17.25865*r)); }
    float cells(vec2 p, float numCells){ p*=numCells; float d=1.0e10;
      for(int xo=-1;xo<=1;xo++){ for(int yo=-1;yo<=1;yo++){
        vec2 tp=floor(p)+vec2(float(xo),float(yo));
        tp=p-tp-Hash2(mod(tp,numCells/TILES));
        d=min(d,dot(tp,tp)); } }
      return sqrt(d); }
    bool dither(vec2 uv1, vec2 uv2){ return mod(uv1.x+uv2.y,2.0/pixels)<=1.0/pixels; }
    vec2 spherify(vec2 uv){ vec2 cc=uv*2.0-1.0; float z=sqrt(1.0-dot(cc.xy,cc.xy)); vec2 s=cc/(z+1.0); return s*0.5+0.5; }
    vec4 ramp(float t){
      if(t<0.16) return vec4(0.74,0.26,0.16,1.0);
      if(t<0.5)  return vec4(0.95,0.45,0.12,1.0);
      if(t<0.83) return vec4(1.0,0.68,0.20,1.0);
      return vec4(1.0,0.94,0.66,1.0);
    }
    void main(){
      vec2 pz=(floor(vUv.xy*pixels)/pixels)+0.5;
      float a=step(distance(pz,vec2(0.5)),0.49999);
      bool dith=dither(vUv.xy,pz);
      pz=rotate(pz,rotation);
      pz=spherify(pz);
      float n=cells(pz-vec2(time*time_speed*2.0,0.0),10.0);
      n*=cells(pz-vec2(time*time_speed*1.0,0.0),20.0);
      n*=2.0; n=clamp(n,0.0,1.0);
      if(dith||!should_dither){ n*=1.3; }
      float interp=floor(n*3.0)/3.0;
      vec4 col=ramp(interp);
      gl_FragColor=vec4(col.rgb, a*col.a);
    }`;

const STARBLOB_FRAG = `
    varying vec3 vUv;
    uniform float pixels, time_speed, time, rotation, seed, circle_amount, circle_size;
    uniform vec4 color;
    float size=4.0;
    float rand(vec2 co){ co=mod(co, vec2(1.0,1.0)*floor(size+0.5)); return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*15.5453*seed); }
    vec2 rotate(vec2 v,float a){ v-=0.5; v*=mat2(vec2(cos(a),-sin(a)),vec2(sin(a),cos(a))); v+=0.5; return v; }
    float circle(vec2 uv){ float invert=1.0/circle_amount;
      if(mod(uv.y,invert*2.0)<invert){ uv.x+=invert*0.5; }
      vec2 rc=floor(uv*circle_amount)/circle_amount;
      uv=mod(uv,invert)*circle_amount;
      float r=rand(rc); r=clamp(r,invert,1.0-invert);
      float ci=distance(uv,vec2(r));
      return smoothstep(ci,ci+0.5, invert*circle_size*rand(rc*1.5)); }
    void main(){
      vec2 pz=(floor(vUv.xy*pixels)/pixels)+0.5;
      vec2 uv=rotate(pz,rotation);
      float angle=atan(uv.x-0.5, uv.y-0.5);
      float d=distance(pz,vec2(0.5));
      float c=0.0;
      for(int i=0;i<15;i++){ float r=rand(vec2(float(i))); vec2 cu=vec2(d,angle); c+=circle(cu*size - time*time_speed - (1.0/d)*0.1 + r); }
      c*=0.37-d;
      c=step(0.07, c-d);
      gl_FragColor=vec4(color.rgb, c*color.a);
    }`;

const STARFLARE_FRAG = `
    varying vec3 vUv;
    uniform float pixels, time_speed, time, rotation, seed, storm_width, storm_dither_width, circle_amount, circle_scale, scale;
    float size=2.0; const int OCTAVES=4; bool should_dither=true;
    float rand(vec2 co){ co=mod(co, vec2(1.0,1.0)*floor(size+0.5)); return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*15.5453*seed); }
    float circle(vec2 uv){ float invert=1.0/circle_amount;
      if(mod(uv.y,invert*2.0)<invert){ uv.x+=invert*0.5; }
      vec2 rc=floor(uv*circle_amount)/circle_amount;
      uv=mod(uv,invert)*circle_amount;
      float r=rand(rc); r=clamp(r,invert,1.0-invert);
      float ci=distance(uv,vec2(r));
      return smoothstep(ci,ci+0.5, invert*circle_scale*rand(rc*1.5)); }
    float noise(vec2 coord){ vec2 i=floor(coord); vec2 f=fract(coord);
      float a=rand(i); float b=rand(i+vec2(1.0,0.0)); float c=rand(i+vec2(0.0,1.0)); float d=rand(i+vec2(1.0,1.0));
      vec2 cu=f*f*(3.0-2.0*f);
      return mix(a,b,cu.x)+(c-a)*cu.y*(1.0-cu.x)+(d-b)*cu.x*cu.y; }
    float fbm(vec2 coord){ float v=0.0; float s=0.5; for(int i=0;i<OCTAVES;i++){ v+=noise(coord)*s; coord*=2.0; s*=0.5; } return v; }
    bool dither(vec2 uv1, vec2 uv2){ return mod(uv1.x+uv2.y,2.0/pixels)<=1.0/pixels; }
    vec2 rotate2(vec2 v,float a){ v-=0.5; v*=mat2(vec2(cos(a),-sin(a)),vec2(sin(a),cos(a))); v+=0.5; return v; }
    vec4 framp(float t){ if(t<0.5) return vec4(1.0,0.68,0.20,1.0); return vec4(1.0,0.94,0.66,1.0); }
    void main(){
      vec2 pz=(floor(vUv.xy*pixels)/pixels)+0.5;
      bool dith=dither(vUv.xy,pz);
      pz=rotate2(pz,rotation);
      vec2 uv=pz;
      float angle=atan(uv.x-0.5, uv.y-0.5)*0.4;
      float d=distance(pz,vec2(0.5));
      vec2 cu=vec2(d,angle);
      float n=fbm(cu*size - time*time_speed);
      float nc=circle(cu*scale - time*time_speed + n);
      nc*=1.5;
      float n2=fbm(cu*size - time + vec2(100.0,100.0));
      nc-=n2*0.1;
      float a=0.0;
      if(1.0-d>nc){
        if(nc>storm_width-storm_dither_width+d && (dith||!should_dither)){ a=1.0; }
        else if(nc>storm_width+d){ a=1.0; }
      }
      float interp=floor(n2+nc);
      vec4 col=framp(interp);
      a*=step(n2*0.25,d);
      gl_FragColor=vec4(col.rgb, a*col.a);
    }`;

type LayerKind =
	| 'base'
	| 'land'
	| 'cloud'
	| 'crater'
	| 'river'
	| 'atmo'
	| 'star'
	| 'starblob'
	| 'starflare';

const FRAGS: Record<LayerKind, string> = {
	base: BASE_FRAG,
	land: LAND_FRAG,
	cloud: CLOUD_FRAG,
	crater: CRATER_FRAG,
	river: RIVER_FRAG,
	atmo: ATMO_FRAG,
	star: STAR_FRAG,
	starblob: STARBLOB_FRAG,
	starflare: STARFLARE_FRAG
};

export type PlanetType = 'star' | 'ocean' | 'lava' | 'hive';

type Uniforms = Record<string, number | number[]>;
interface LayerSpec {
	kind: LayerKind;
	scale: number;
	u: Uniforms;
}

function c(r: number, g: number, b: number, a?: number): number[] {
	return [r / 255, g / 255, b / 255, a == null ? 1 : a];
}
function rseed(): number {
	return Math.random() > 0.5 ? Math.random() * 10 : Math.random() * 100;
}
const LIGHT = [0.39, 0.7];

// ---- planet recipes (which layers + colours), as a data-driven registry (ADR 0005) ----
// Each archetype is a builder keyed by its render key. They are NOT distinct shader programs:
// every world reuses the same handful of layer shaders (base/land/cloud/crater/river/atmo) and
// differs only in which layers it stacks and in their palette. Adding a world type is an entry
// here, not new GLSL. `base()` supplies the shared per-layer uniforms; `seed` desyncs the noise.
type RecipeBuilder = (base: (extra: Uniforms) => Uniforms, seed: number) => LayerSpec[];

const RECIPES: Record<string, RecipeBuilder> = {
	star: (): LayerSpec[] => [
		{
			kind: 'starblob',
			scale: 0.92,
			u: {
				pixels: 200,
				time_speed: 0.1,
				rotation: Math.random(),
				seed: rseed(),
				time: 0,
				circle_amount: 3.0,
				circle_size: 1.5,
				color: c(255, 168, 38, 1)
			}
		},
		{
			kind: 'star',
			scale: 0.46,
			u: { pixels: 100, time_speed: 0.012, rotation: Math.random(), seed: rseed(), time: 0 }
		},
		{
			kind: 'starflare',
			scale: 0.72,
			u: {
				pixels: 200,
				time_speed: 0.05,
				rotation: Math.random(),
				seed: rseed(),
				time: 0,
				storm_width: 0.2,
				storm_dither_width: 0.07,
				circle_amount: 2.0,
				circle_scale: 1.0,
				scale: 1.0
			}
		}
	],

	ocean: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({ color1: c(102, 176, 199), color2: c(70, 130, 165), color3: c(52, 65, 157) })
		},
		{
			kind: 'land',
			scale: 0.84,
			u: base({
				land_cutoff: 0.62,
				time_speed: 0.05,
				col1: c(120, 180, 90),
				col2: c(99, 171, 63),
				col3: c(47, 87, 83),
				col4: c(40, 53, 64)
			})
		},
		{
			kind: 'cloud',
			scale: 0.84,
			u: base({
				time_speed: 0.07,
				cloud_cover: 0.52,
				stretch: 2.5,
				base_color: c(225, 242, 255),
				outline_color: c(192, 227, 255),
				shadow_base_color: c(94, 112, 165),
				shadow_outline_color: c(64, 73, 115)
			})
		},
		{
			kind: 'atmo',
			scale: 1.0,
			u: {
				color: c(150, 205, 225, 0.22),
				color2: c(70, 150, 220, 0.32),
				color3: c(20, 60, 140, 0.42)
			}
		}
	],

	lava: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({
				color1: [0.560784, 0.301961, 0.341176, 1],
				color2: [0.321569, 0.2, 0.247059, 1],
				color3: [0.239216, 0.160784, 0.211765, 1]
			})
		},
		{
			kind: 'crater',
			scale: 0.84,
			u: base({ color1: [0.321569, 0.2, 0.247059, 1], color2: [0.239216, 0.160784, 0.211765, 1] })
		},
		{
			kind: 'river',
			scale: 0.84,
			u: base({
				river_cutoff: 0.6,
				time_speed: 0.04,
				color1: [1, 0.537255, 0.2, 1],
				color2: [0.901961, 0.270588, 0.223529, 1],
				color3: [0.678431, 0.184314, 0.270588, 1]
			})
		},
		{
			kind: 'atmo',
			scale: 1.0,
			u: {
				color: c(255, 150, 70, 0.16),
				color2: c(220, 90, 50, 0.24),
				color3: c(120, 30, 30, 0.3)
			}
		}
	],

	hive: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({ color1: c(176, 182, 196), color2: c(112, 118, 134), color3: c(64, 68, 84) })
		},
		{ kind: 'crater', scale: 0.84, u: base({ color1: c(120, 126, 142), color2: c(70, 74, 90) }) },
		{
			kind: 'land',
			scale: 0.84,
			u: base({
				land_cutoff: 0.55,
				col1: c(150, 156, 168),
				col2: c(112, 118, 132),
				col3: c(80, 84, 98),
				col4: c(56, 60, 72)
			})
		},
		{
			kind: 'atmo',
			scale: 1.0,
			u: {
				color: c(170, 185, 205, 0.16),
				color2: c(120, 140, 175, 0.22),
				color3: c(70, 85, 120, 0.3)
			}
		}
	],

	// ── recolour archetypes (ADR 0005): same layers, new palettes ──
	ice: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({ color1: c(224, 238, 246), color2: c(160, 196, 214), color3: c(108, 146, 176) })
		},
		{
			kind: 'crater',
			scale: 0.84,
			u: base({ color1: c(198, 220, 232), color2: c(140, 174, 196) })
		},
		{
			kind: 'atmo',
			scale: 1.0,
			u: {
				color: c(196, 230, 245, 0.2),
				color2: c(140, 200, 235, 0.28),
				color3: c(90, 150, 205, 0.34)
			}
		}
	],

	desert: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({ color1: c(216, 178, 122), color2: c(181, 137, 79), color3: c(138, 94, 52) })
		},
		{
			kind: 'land',
			scale: 0.84,
			u: base({
				land_cutoff: 0.5,
				time_speed: 0.03,
				col1: c(202, 158, 99),
				col2: c(168, 121, 66),
				col3: c(128, 86, 46),
				col4: c(96, 62, 34)
			})
		},
		{
			kind: 'atmo',
			scale: 1.0,
			u: {
				color: c(232, 198, 142, 0.16),
				color2: c(196, 150, 84, 0.22),
				color3: c(150, 104, 52, 0.28)
			}
		}
	],

	verdant: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({ color1: c(64, 132, 92), color2: c(40, 96, 64), color3: c(26, 64, 46) })
		},
		{
			kind: 'land',
			scale: 0.84,
			u: base({
				land_cutoff: 0.42,
				col1: c(126, 188, 96),
				col2: c(86, 154, 72),
				col3: c(52, 110, 56),
				col4: c(34, 74, 44)
			})
		},
		{
			kind: 'cloud',
			scale: 0.84,
			u: base({
				time_speed: 0.06,
				cloud_cover: 0.6,
				stretch: 2.2,
				base_color: c(232, 246, 228),
				outline_color: c(200, 226, 196),
				shadow_base_color: c(96, 132, 100),
				shadow_outline_color: c(64, 92, 68)
			})
		},
		{
			kind: 'atmo',
			scale: 1.0,
			u: {
				color: c(170, 224, 168, 0.16),
				color2: c(110, 184, 116, 0.22),
				color3: c(56, 130, 78, 0.3)
			}
		}
	],

	death: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({ color1: c(122, 110, 70), color2: c(90, 78, 50), color3: c(60, 52, 36) })
		},
		{
			kind: 'land',
			scale: 0.84,
			u: base({
				land_cutoff: 0.48,
				col1: c(150, 178, 78),
				col2: c(112, 144, 56),
				col3: c(78, 104, 44),
				col4: c(52, 68, 36)
			})
		},
		{
			kind: 'atmo',
			scale: 1.0,
			u: {
				color: c(170, 200, 96, 0.18),
				color2: c(126, 162, 60, 0.26),
				color3: c(82, 110, 44, 0.32)
			}
		}
	],

	// Dead, airless rock — base + craters, deliberately NO atmosphere ring.
	barren: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({ color1: c(150, 146, 138), color2: c(106, 102, 96), color3: c(66, 63, 59) })
		},
		{ kind: 'crater', scale: 0.84, u: base({ color1: c(122, 118, 110), color2: c(74, 71, 66) }) }
	],

	river: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({ color1: c(96, 132, 92), color2: c(68, 102, 70), color3: c(46, 72, 52) })
		},
		{
			kind: 'land',
			scale: 0.84,
			u: base({
				land_cutoff: 0.5,
				col1: c(132, 168, 96),
				col2: c(96, 138, 74),
				col3: c(64, 102, 56),
				col4: c(44, 72, 46)
			})
		},
		{
			kind: 'river',
			scale: 0.84,
			u: base({
				river_cutoff: 0.55,
				time_speed: 0.03,
				color1: c(120, 188, 210),
				color2: c(74, 140, 178),
				color3: c(46, 96, 140)
			})
		},
		{
			kind: 'atmo',
			scale: 1.0,
			u: {
				color: c(176, 214, 196, 0.16),
				color2: c(118, 178, 168, 0.22),
				color3: c(70, 130, 130, 0.3)
			}
		}
	],

	// Gas giant: banded body + heavily-stretched cloud bands. No new shader — the cloud layer's
	// `stretch` flattens its noise into horizontal storm bands (ADR 0005).
	gas: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.84,
			u: base({ color1: c(226, 178, 120), color2: c(192, 134, 78), color3: c(150, 96, 58) })
		},
		{
			kind: 'cloud',
			scale: 0.84,
			u: base({
				time_speed: 0.05,
				cloud_cover: 0.28,
				stretch: 6.5,
				base_color: c(238, 206, 158),
				outline_color: c(214, 168, 112),
				shadow_base_color: c(150, 96, 58),
				shadow_outline_color: c(112, 70, 44)
			})
		},
		{
			kind: 'atmo',
			scale: 1.0,
			u: {
				color: c(238, 198, 150, 0.2),
				color2: c(206, 150, 92, 0.26),
				color3: c(150, 96, 58, 0.32)
			}
		}
	],

	// Asteroid: a dark, heavily-cratered planetoid, no atmosphere. A true many-rock *field* needs
	// its own shader; this reads as the largest body in the cluster (ADR 0005).
	asteroid: (base): LayerSpec[] => [
		{
			kind: 'base',
			scale: 0.78,
			u: base({ color1: c(120, 112, 100), color2: c(86, 80, 70), color3: c(52, 48, 42) })
		},
		{ kind: 'crater', scale: 0.78, u: base({ color1: c(98, 92, 82), color2: c(58, 54, 48) }) }
	]
};

function recipe(type: PlanetType | string): LayerSpec[] {
	const seed = rseed();
	const base = (extra: Uniforms): Uniforms =>
		Object.assign(
			{
				pixels: 100,
				lightIntensity: 0.1,
				light_origin: LIGHT,
				time_speed: 0.05,
				rotation: 0.0,
				seed,
				time: 0
			},
			extra
		);
	return (RECIPES[type] ?? RECIPES.hive)(base, seed);
}

// ---- GL helpers ----
interface Prog {
	program: WebGLProgram;
	loc: Record<string, WebGLUniformLocation | null>;
	aPos: number;
}

function makeShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
	const s = gl.createShader(type);
	if (!s) return null;
	gl.shaderSource(s, src);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		console.error('PixelPlanet shader error:', gl.getShaderInfoLog(s), src);
		return null;
	}
	return s;
}

function makeProgram(gl: WebGLRenderingContext, frag: string): Prog | null {
	const vs = makeShader(gl, gl.VERTEX_SHADER, VERT);
	const fs = makeShader(gl, gl.FRAGMENT_SHADER, HEAD + frag);
	if (!vs || !fs) return null;
	const p = gl.createProgram();
	if (!p) return null;
	gl.attachShader(p, vs);
	gl.attachShader(p, fs);
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
		console.error('PixelPlanet link error:', gl.getProgramInfoLog(p));
		return null;
	}
	return { program: p, loc: {}, aPos: gl.getAttribLocation(p, 'aPos') };
}

function loc(gl: WebGLRenderingContext, p: Prog, name: string): WebGLUniformLocation | null {
	if (!(name in p.loc)) p.loc[name] = gl.getUniformLocation(p.program, name);
	return p.loc[name];
}

// ---- instance + shared ticker ----
const instances = new Set<PixelPlanet>();
let rafId: number | null = null;
function tick() {
	const t = performance.now() / 1000;
	instances.forEach((inst) => inst.draw(t));
	rafId = instances.size ? requestAnimationFrame(tick) : null;
}

interface Layer {
	prog: Prog | null;
	scale: number;
	u: Uniforms;
}

export class PixelPlanet {
	private canvas: HTMLCanvasElement;
	private gl: WebGLRenderingContext | null;
	private buf: WebGLBuffer | null = null;
	private progs: Record<string, Prog | null> = {};
	private layers: Layer[] = [];
	private timeOffset: number;

	constructor(
		canvas: HTMLCanvasElement,
		type: PlanetType | string,
		opts?: { resolution?: number }
	) {
		opts = opts || {};
		this.canvas = canvas;
		const res = opts.resolution || 200;
		canvas.width = res;
		canvas.height = res;
		const gl = canvas.getContext('webgl', {
			alpha: true,
			premultipliedAlpha: false,
			antialias: true,
			depth: false,
			preserveDrawingBuffer: true
		}) as WebGLRenderingContext | null;
		this.gl = gl;
		this.timeOffset = Math.random() * 100; // desync rotations
		if (!gl) {
			console.error('PixelPlanet: no WebGL');
			return;
		}
		gl.viewport(0, 0, res, res);
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		// quad
		this.buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
			gl.STATIC_DRAW
		);
		// programs (cache per-kind on this context)
		this.layers = recipe(type).map((L) => {
			if (!this.progs[L.kind]) this.progs[L.kind] = makeProgram(gl, FRAGS[L.kind]);
			return { prog: this.progs[L.kind], scale: L.scale, u: L.u };
		});
		instances.add(this);
		if (!rafId) rafId = requestAnimationFrame(tick);
	}

	/** Called by the shared ticker; public so the module-level tick() can reach it. */
	draw(t: number) {
		const gl = this.gl;
		if (!gl) return;
		const time = t + this.timeOffset;
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		for (const layer of this.layers) {
			const p = layer.prog;
			if (!p) continue;
			gl.useProgram(p.program);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
			gl.enableVertexAttribArray(p.aPos);
			gl.vertexAttribPointer(p.aPos, 2, gl.FLOAT, false, 0, 0);
			gl.uniform1f(loc(gl, p, 'uScale'), layer.scale);
			const u = layer.u;
			for (const name in u) {
				const l = loc(gl, p, name);
				if (l == null) continue;
				const v = u[name];
				if (typeof v === 'number') gl.uniform1f(l, v);
				else if (v.length === 2) gl.uniform2fv(l, v);
				else if (v.length === 4) gl.uniform4fv(l, v);
			}
			const tl = loc(gl, p, 'time');
			if (tl != null) gl.uniform1f(tl, time);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
	}

	dispose() {
		instances.delete(this);
		const gl = this.gl;
		if (!gl) return;
		const ext = gl.getExtension('WEBGL_lose_context');
		if (ext) ext.loseContext();
	}
}
