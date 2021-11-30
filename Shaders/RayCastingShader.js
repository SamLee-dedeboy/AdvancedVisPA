const RayCastingShader = {
    vsSrc:
    `#version 300 es
	in vec3 pos;
	uniform mat4 M_DATA_TO_CLIP_SPACE;
	uniform float xDim;
	uniform float yDim;
	uniform float zDim;


	out vec3 texCoord;
	out vec3 v_surfaceToLight;
	out vec3 v_surfaceToCam;
	void main(void) { 
		texCoord = vec3(
			pos.x/xDim,
			pos.y/yDim,
			pos.z/zDim
		);
		gl_Position = M_DATA_TO_CLIP_SPACE * vec4(      
			pos.x,
			pos.y,                   
			pos.z,                   
			1.0                  
		); 

    }`,
    fsSrc:
    `#version 300 es
precision highp float;

uniform highp sampler3D volSampler;
uniform highp sampler2D exitPointSampler;

uniform highp sampler2D colSampler;
uniform highp sampler2D opcSampler;
uniform highp sampler2D preIntSampler;
uniform highp sampler2D approxEntryPointDepthSampler;
uniform highp sampler2D approxExitPointSampler;
uniform float xDim;
uniform float yDim;
uniform float zDim;
uniform float sampleDistance;
uniform float dataMin;
uniform float dataMax;
uniform int width;
uniform int height;

uniform mat4 M_WORLD_TO_DATA_SPACE;
uniform mat4 M_DATA_TO_WORLD_SPACE;
// lighting
uniform vec3 lightWorldPosition;
uniform vec3 camWorldPosition;
uniform vec3 lightColor;
uniform int doLighting;
uniform int preIntegrated;
uniform int skipMode;
out vec4 fragColor;
in vec3 texCoord;

vec3 centralDifferenceNormal(vec3 texCoord) {
	float h_x = 1.0/xDim;
	float h_y = 1.0/yDim;
	float h_z = 1.0/zDim;
	float v_normal_x = 
		texture(volSampler, vec3(
			texCoord.x + h_x,
			texCoord.y,
			texCoord.z
		)).r 
		-
		texture(volSampler, vec3(
			texCoord.x - h_x,
			texCoord.y,
			texCoord.z
		)).r;
	float v_normal_y = 
		texture(volSampler, vec3(
			texCoord.x,
			texCoord.y + h_y,
			texCoord.z
		)).r 
		-
		texture(volSampler, vec3(
			texCoord.x,
			texCoord.y - h_y,
			texCoord.z
		)).r;
	float v_normal_z = 
		texture(volSampler, vec3(
			texCoord.x,
			texCoord.y,
			texCoord.z + h_z
		)).r 
		-
		texture(volSampler, vec3(
			texCoord.x,
			texCoord.y,
			texCoord.z - h_z
		)).r;

	// normal
	vec3 v_normal = vec3(v_normal_x, v_normal_y, v_normal_z);

	vec3 normal = normalize(v_normal);

	// if(v_normal.x == 0.0 && v_normal.y == 0.0 && v_normal.z == 0.0) {
	// 	normal = vec3(0,0,0);			
	// }

	return normal;
}
void main(void) {
	// fragColor = vec4(1, 0, 0, 0.1);
	// return;
	vec2 fragPos = gl_FragCoord.xy;
	vec2 normalizedFragPos = fragPos / vec2(width, height);
	vec3 entryPoint, exitPoint;
	if(skipMode == 1) {
		float entryPointDepth = texture(approxEntryPointDepthSampler, normalizedFragPos.xy).x;
		if(gl_FragCoord.z > entryPointDepth) discard;

		entryPoint = texCoord;
		exitPoint = texture(approxExitPointSampler, normalizedFragPos.xy).xyz;
	} else if(skipMode == 0) {
		entryPoint = texCoord;
		exitPoint = texture(exitPointSampler, normalizedFragPos.xy).xyz;
	}
	// constant params
	vec3 dims = vec3(xDim, yDim, zDim);
	vec3 fullRay = (exitPoint - entryPoint) * dims;
	vec3 rayDirection = normalize(fullRay);
	float totalDistance = length(fullRay);
	int nSample = int(totalDistance/sampleDistance);
	vec3 t0 = entryPoint * dims;
	int preMultiplied = preIntegrated;

	// variable params
	vec3 rayPos = t0;
	vec3 dstColor = vec3(0.0, 0.0, 0.0);
	float dstAlpha = 0.0;
	vec3 newTexCoord = entryPoint;
	vec3 lightColorMultiplied;
	for(int i = preIntegrated; i < nSample; i++, rayPos += rayDirection * sampleDistance) {
		float opacity;
		vec3 color;
		if(preIntegrated == 1) {
			// pre integral
			vec3 rayPosA = t0 + float(i-1) * rayDirection * sampleDistance;
			vec3 rayPosB = t0 + float(i) * rayDirection * sampleDistance;

			vec3 tcA = rayPosA / dims;
			vec3 tcB = rayPosB / dims;

			float normDataValueA = (texture(volSampler, tcA).r - dataMin) / (dataMax - dataMin);
			float normDataValueB = (texture(volSampler, tcB).r - dataMin) / (dataMax - dataMin);
			
			newTexCoord = (tcA + tcB)/2.0;
			vec4 preIntColor = texture(preIntSampler, vec2(normDataValueA, normDataValueB)).rgba;
			opacity = preIntColor.a;
			color = preIntColor.rgb;
		} else {
			newTexCoord = rayPos/dims;
			float dataValue = texture(volSampler, newTexCoord).r;
			float normDataValue = (dataValue - dataMin) / (dataMax - dataMin);
			opacity = texture(opcSampler, vec2(normDataValue, 0.5)).r;
			color = texture(colSampler, vec2(normDataValue, 0.5)).rgb;
		}
		if(opacity == 0.0) continue;
		
		

		if(doLighting == 1) {
			vec3 Ia = vec3( 1.0, 1.0, 1.0 );

			//  diffuse light color
			vec3 Id = lightColor;

			//  specular light color
			vec3 Is = lightColor;                

			//  ambient material color
			vec3 Ma = color;

			//  diffuse material color
			vec3 Md = color;

			// specular material color
			vec3 Ms = color;
			

			// amount of ambient light
			float Ka = 0.3;

			// amount of diffuse light
			float Kd = 0.8;

			// amount of specular light
			float Ks = 0.8;
				
			// shininess of material, affects specular lighting
			float shininess = 20.0;

			// sample point world space pos
			vec3 sampleWorldSpace = (M_DATA_TO_WORLD_SPACE * vec4(
				rayPos.x,
				rayPos.y,
				rayPos.z,
				1.0
			)).xyz;

			vec3 normal = centralDifferenceNormal(newTexCoord);

			// light dir
			vec3 v_surfaceToLight =  sampleWorldSpace - lightWorldPosition;
			vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
			
			// cam dir
			vec3 v_surfaceToCam = sampleWorldSpace - camWorldPosition;
			vec3 surfaceToCamDirection = normalize(v_surfaceToCam);
			
			// half vec
			vec3 halfVector = normalize(surfaceToLightDirection + surfaceToCamDirection);
			
			// light & spec
			float lambertian = max(dot(normal, surfaceToLightDirection ), 0.0);
			
			
			vec3 ambient = Ma * Ia;
			vec3 diffuse = Md * Id * lambertian;

			vec3 specular = (lambertian <= 0.0) ? vec3(0.0) : Is * Ms * pow( max(dot(normal, halfVector), 0.0), shininess);
			
			// do lighting
			color  = min(  Ka * ambient + Kd * diffuse + Ks * specular, vec3( 1.0 ) );
	
		}

	
		float unitDist = 1.0;

		// correction
		float srcAlphaCorrected = 1.0 - pow(1.0 - opacity, sampleDistance / unitDist);

		vec3 srcColorCorrected =  color *  ( sampleDistance / unitDist );

		if(preMultiplied == 0) {
			srcColorCorrected *= opacity;
		}

		// composite
		dstAlpha += (1.0 - dstAlpha) * srcAlphaCorrected;
		dstColor += (1.0 - dstAlpha) * srcColorCorrected;
		
		if(1.0 - dstAlpha == 0.0) break;
		
		// // move forward
		// rayPos += rayDirection * sampleDistance;
	}	
	
	fragColor = vec4(dstColor, dstAlpha);
	//fragColor = vec4(1, 0, 0, 1);

}`
}