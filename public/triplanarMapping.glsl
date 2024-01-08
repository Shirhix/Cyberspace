varying vec4 vPos;
varying vec3 vNormal;
varying vec2 vTexcoord;

void main()
{
	vPos =  vec4( gl_Vertex.xyz, 1.0 );
	vNormal = normalize(gl_NormalMatrix * gl_Normal);
}

uniform float normalRepeat;
uniform sampler2D tNormal;

varying vec3 vNormal;
varying vec3 vEye;
varying vec2 vTexcoord;

vec3 getTriPlanarBlend(vec3 _wNorm)
{
	vec3 blending = abs( _wNorm );
	blending = normalize(max(blending, 0.00001)); 
	float b = (blending.x + blending.y + blending.z);
	blending /= vec3(b, b, b);
	return blending;
}

void main()
{
	vec3 blending = getTriPlanarBlend(vNormal);
	vec3 xaxis = texture2D( tNormal, vPos.yz * normalRepeat).rgb;
	vec3 yaxis = texture2D( tNormal, vPos.xz * normalRepeat).rgb;
	vec3 zaxis = texture2D( tNormal, vPos.xy * normalRepeat).rgb;
	vec3 normalTex = xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;
	
	normalTex = normalTex * 2.0 - 1.0;
	normalTex.xy *= normalScale;
	normalTex = normalize( normalTex );

	vec3 T = vec3(0.,1.,0.);
  	vec3 BT = normalize( cross( vNormal, T ) * 1.0 );

  	mat3 tsb = mat3( normalize( T ), normalize( BT ), normalize( vNormal ) );
  	vec3 N = tsb * normalTex;
}
