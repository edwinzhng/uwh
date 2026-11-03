export const liquidVertex = `
attribute vec2 aPosition;
varying vec2 vUv;
void main(){vUv=aPosition*0.5+0.5;gl_Position=vec4(aPosition,0.,1.);}
`;
export const liquidFieldFragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uSize;
uniform int uCount;
uniform vec4 uBodies[128];
float rounded(vec2 p,vec2 halfSize,float radius){vec2 q=abs(p)-halfSize+radius;return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;}
void main(){
 vec2 p=vec2(vUv.x,1.-vUv.y)*uSize;
 float distance=64.;
 for(int i=0;i<64;i++){
  if(i>=uCount)break;
  vec4 shape=uBodies[i*2];vec4 material=uBodies[i*2+1];
  float c=cos(material.z),s=sin(material.z);
  vec2 q=p-shape.xy;
  q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y)/vec2(material.y,1./material.y);
  float next=rounded(q,shape.zw,material.x);
  float h=clamp(.5+.5*(next-distance)/material.w,0.,1.);
  distance=mix(next,distance,h)-material.w*h*(1.-h);
 }
 float value=clamp((distance+64.)/128.,0.,1.);
 vec2 encodedDistance=vec2(value,fract(value*255.));
 encodedDistance.x-=encodedDistance.y/255.;
 gl_FragColor=vec4(encodedDistance,0.,1.);
}
`;
export const liquidShadeFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uField;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform float uDark;
float field(vec2 uv){return dot(texture2D(uField,uv).rg,vec2(1.,1./255.))*128.-64.;}
vec3 floorColor(vec2 p){
 vec3 base=mix(vec3(.95,.95,.92),vec3(.075,.10,.085),uDark);
 float lane=pow(.5+.5*cos((p.y+sin(p.x*.007)*6.)*.055),40.);
 vec3 tint=mix(vec3(.66,.78,.74),vec3(.12,.20,.18),uDark);
 return mix(base,tint,lane*.28)+vec3(.015,.025,.04)*sin(p.x*.006+p.y*.003);
}
void main(){
 float d=field(vUv);
 if(d>2.){gl_FragColor=vec4(0.);return;}
 vec2 g=vec2(field(vUv+vec2(uTexel.x,0.))-field(vUv-vec2(uTexel.x,0.)),field(vUv+vec2(0.,uTexel.y))-field(vUv-vec2(0.,uTexel.y)));
 vec2 n=g/max(length(g),.001);
 float depth=max(-d,0.);
 float edge=exp(-depth/5.);
 vec2 p=vec2(vUv.x,1.-vUv.y)*uSize;
 vec2 bend=vec2(n.x,-n.y)*edge*15.;
 vec3 color=vec3(floorColor(p+bend*1.06).r,floorColor(p+bend).g,floorColor(p+bend*.94).b);
 color=mix(color,mix(vec3(.78,.88,.85),vec3(.14,.20,.18),uDark),.22);
 float key=pow(max(dot(n,normalize(vec2(-1.,1.))),0.),3.);
 float rim=exp(-abs(d+.65)*1.2);
 color+=vec3(.65,.78,.85)*rim*(.10+key*.5)+vec3(.12,.16,.18)*edge*key;
 float alpha=1.-smoothstep(-.5,1.,d);
 gl_FragColor=vec4(color*alpha,alpha);
}
`;
