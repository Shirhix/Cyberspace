void main()
{

    vec3 tnormalX = UnpackNormal(texture2D(_BumpMap, i.worldPos.zy));
    vec3 tnormalY = UnpackNormal(texture2D(_BumpMap, i.worldPos.xz));
    vec3 tnormalZ = UnpackNormal(texture2D(_BumpMap, i.worldPos.xy));

    vec3 normalX = vec3(0.0, tnormalX.yx);
    vec3 normalY = vec3(tnormalY.x, 0.0, tnormalY.y);
    vec3 normalZ = vec3(tnormalZ.xy, 0.0);

    vec3 worldNormal = normalize(normalX.xyz * blend.x + normalY.xyz * blend.y + normalZ.xyz * blend.z + i.worldNormal);
}

vec3 UnpackNormal(vec4 packednormal) {
    vec3 normal;
        normal.xy = packednormal.wy * 2 - 1;
        normal.z = sqrt(1 - normal.x*normal.x - normal.y * normal.y);
    return normal;
}
 


uniform sampler2D tNormal;
varying vec3 vNormal;
varying vec3 vEye;

vec3 getTriPlanarBlend(vec3 _wNorm){
	vec3 blending = abs( _wNorm );
	    blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0
	float b = (blending.x + blending.y + blending.z);
	    blending /= vec3(b, b, b);
	return blending;
}

void main(){
	vec3 blending = getTriPlanarBlend(vNormal);
	vec3 xaxis = texture2D( tNormal, vPos.yz * normalRepeat).rgb;
	vec3 yaxis = texture2D( tNormal, vPos.xz * normalRepeat).rgb;
	vec3 zaxis = texture2D( tNormal, vPos.xy * normalRepeat).rgb;
	vec3 normalTex = xaxis * blending.x + xaxis * blending.y + zaxis * blending.z;
	normalTex = normalTex * 2.0 - 1.0;
	normalTex.xy *= normalScale;
	normalTex = normalize( normalTex );

	vec3 T = vec3(0.,1.,0.);
  	vec3 BT = normalize( cross( vNormal, T ) * 1.0 );

  	mat3 tsb = mat3( normalize( T ), normalize( BT ), normalize( vNormal ) );
  	vec3 N = tsb * normalTex;
}
