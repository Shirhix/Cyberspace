precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;

// Varying
varying vec4 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;

void main()
{
	vec4 outPosition = worldViewProjection * vec4(position, 1.0);
    gl_Position = outPosition;

	// paste varyings
	vPosition =  position;
	vNormal = normal;
	vTexcoord = uv;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
precision highp float;

// Varying
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUV;

// Uniforms
uniform mat4 world;
uniform vec3 cameraPosition;
uniform sampler2D textureSampler;
uniform sampler2D tNormal;
uniform float normalRepeat;
uniform vec3 lightPosition;

void main(void) 
{
    // World values
    vec3 vPositionW = vec3(world * vec4(vPosition, 1.0));
    vec3 vNormalW = normalize(vec3(world * vec4(vNormal, 0.0)));
    vec3 viewDirectionW = normalize(cameraPosition - vPositionW);

    // Light
    vec3 lightVectorW = normalize(lightPosition - vPositionW);
    vec3 color = texture2D(textureSampler, vUV).rgb;

    // diffuse
    float ndl = max(0., dot(vNormalW, lightVectorW));

    // Specular
    vec3 angleW = normalize(viewDirectionW + lightVectorW);
    float specComp = max(0., dot(vNormalW, angleW));
    specComp = pow(specComp, max(1., 64.)) * 2.;

    gl_FragColor = vec4(color * ndl + vec3(specComp), 1.);
}





uniform sampler2D textureSampler;
uniform sampler2D tNormal;
uniform float normalRepeat;

varying vec4 vPosition;
varying vec3 vNormal;
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
	// base color
	vec4 color = texture2D(tex)


	// normals
	vec3 blending = getTriPlanarBlend(vNormal);
	vec3 xaxis = texture2D( tNormal, vPosition.yz * normalRepeat).rgb;
	vec3 yaxis = texture2D( tNormal, vPosition.xz * normalRepeat).rgb;
	vec3 zaxis = texture2D( tNormal, vPosition.xy * normalRepeat).rgb;
	vec3 normalTex = xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;
	
	normalTex = normalTex * 2.0 - 1.0;
	normalTex.xy *= normalScale;
	normalTex = normalize( normalTex );

	vec3 T = vec3(0.,1.,0.);
  	vec3 BT = normalize( cross( vNormal, T ) * 1.0 );
  	mat3 tsb = mat3( normalize( T ), normalize( BT ), normalize( vNormal ) );
  	vec3 N = tsb * normalTex;
}
