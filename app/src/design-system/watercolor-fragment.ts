export const watercolorFragment = `#version 300 es
precision highp float;
uniform mediump vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_grain;
uniform float u_smoothness;
uniform vec3 u_base;
uniform vec3 u_pigment;
uniform vec3 u_ground;
out vec4 fragColor;
float random(float n){return fract(sin(n*127.1+u_seed*311.7)*43758.5453);}
void main(){
 vec2 uv=gl_FragCoord.xy/u_resolution;
 float angle=mix(.55,1.0,random(1.))+step(.5,random(9.))*1.570796;
 mat2 turn=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
 vec2 p=turn*(uv-.5);
 float phase=random(2.)*6.283185+u_time*.12;
 float spacing=mix(1.1,2.1,random(3.));
 float bend=sin(p.y*mix(3.5,5.5,random(4.))+phase)*mix(.3,.55,random(5.));
 float wave=.5+.5*sin((p.x+bend)*spacing*3.141593+phase);
 float field=smoothstep(mix(.12,.35,1.-u_smoothness),mix(.88,.65,1.-u_smoothness),wave);
 vec2 anchor=vec2(random(6.),random(7.));
 float bloom=exp(-dot(uv-anchor,uv-anchor)*mix(1.5,7.,random(8.)));
 vec3 pigment=mix(u_base,u_pigment,field*.65+bloom*.2);
 pigment=mix(pigment,u_ground,(1.-field)*.25);
 float paper=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233))+u_seed)*43758.5453)-.5;
 fragColor=vec4(clamp(pigment+paper*u_grain*.18,0.,1.),1.);
}`;
