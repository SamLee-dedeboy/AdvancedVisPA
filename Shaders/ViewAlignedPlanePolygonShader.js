const ViewAlignedPlanePolygonShader = {
    vsSrc:
    `#version 300 es
	in float Vin;

	uniform float xDim;
	uniform float yDim;
	uniform float zDim;
	uniform float t0;
	uniform float dt;
	uniform int frontIndex;
	uniform vec3 vecView;

	uniform mat4 M_DATA_SPACE;
	uniform mat4 M_CLIP_SPACE;

	uniform int nSequence[64];
	uniform vec3 vecVertices[8];
	uniform int v1[24];
	uniform int v2[24];
	uniform vec3 lightWorldPosition;
	uniform vec3 camWorldPosition;
	out vec3 texCoord;
	out float h_x;
	out float h_y;
	out float h_z;
	out vec3 v_surfaceToLight;
	out vec3 v_surfaceToCam;
	void main(void) {
		//float dPlane = t0 + Vin.y*dt;
		float dPlane = t0 + float(gl_InstanceID)*dt;
		//float dPlane = t0 + float(300)*dt;
		vec3 worldSpacePos;
		for(int e = 0; e < 4; ++e) {
			int vidx1 = nSequence[frontIndex*8 + v1[int(Vin)*4 + e]];
			int vidx2 = nSequence[frontIndex*8 + v2[int(Vin)*4 + e]];
			vec3 vecV1 = vecVertices[vidx1];
			vec3 vecV2 = vecVertices[vidx2];
			vec3 vecStart = vecV1;
			vec3 vecDir = vecV2 - vecV1;
			float denom = dot(vecDir, vecView);
			float lambda = (denom!=0.0) ? (dPlane - dot(vecStart, vecView))/denom: -1.0;
			
			if((lambda >= 0.0) && (lambda <= 1.0)) {
				worldSpacePos = vecStart + lambda * vecDir;
				break;
			}
			
		}
	
		vec3 dataSpacePos = (M_DATA_SPACE * vec4(
			worldSpacePos.x,
			worldSpacePos.y,
			worldSpacePos.z,
			1.0
		)).xyz;

		texCoord = vec3( 
			dataSpacePos.x/xDim,
			dataSpacePos.y/yDim,
			dataSpacePos.z/zDim
		);
		
		gl_Position = M_CLIP_SPACE * vec4(
			worldSpacePos.x,
			worldSpacePos.y,
			worldSpacePos.z,
			1.0
		);
		h_x = 1.0/xDim;
		h_y = 1.0/yDim;
		h_z = 1.0/zDim;
		v_surfaceToLight = worldSpacePos - lightWorldPosition;
		v_surfaceToCam = worldSpacePos - camWorldPosition;
	}`,
    fsSrc:
    `#version 300 es
	precision highp float;	
	precision highp float;
	in vec3 texCoord;
	in float h_x;
	in float h_y;
	in float h_z;
	in vec3 v_surfaceToLight;
	in vec3 v_surfaceToCam;
	uniform int doLighting;
	uniform vec3 lightColor;
	uniform highp sampler3D volSampler;
	uniform highp sampler2D colSampler;
	uniform highp sampler2D opcSampler;
	uniform float dataMin;
	uniform float dataMax;
	uniform float alphaScale;

	out vec4 fragColor;
	vec3 centralDifferenceNormal(vec3 texCoord) {
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
		//if(texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0 || texCoord.z < 0.0 || texCoord.z > 1.0) { discard; }
		float light = 1.0;
		float specular = 0.0;
		float dataValue = texture(volSampler, texCoord).r;
		float normDataValue = (dataValue - dataMin) / (dataMax - dataMin);
		float opacity = texture(opcSampler, vec2(normDataValue, 0.5)).r;
		vec3 color = texture(colSampler, vec2(normDataValue, 0.5)).rgb;

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

			
			vec3 normal = centralDifferenceNormal(texCoord);
			vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
			vec3 surfaceToCamDirection = normalize(v_surfaceToCam);
			vec3 halfVector = normalize(surfaceToLightDirection + surfaceToCamDirection);
			
			float lambertian = max(dot(normal, surfaceToLightDirection ), 0.0);
			
			
			vec3 ambient = Ma * Ia;
			vec3 diffuse = Md * Id * lambertian;

			vec3 specular = (lambertian <= 0.0) ? vec3(0.0) : Is * Ms * pow( max(dot(normal, halfVector), 0.0), shininess);
			
			// do lighting
			color  = min(  Ka * ambient + Kd * diffuse + Ks * specular, vec3( 1.0 ) );
		}

		opacity = opacity*alphaScale;

		fragColor = vec4(color, opacity);
	}`
}