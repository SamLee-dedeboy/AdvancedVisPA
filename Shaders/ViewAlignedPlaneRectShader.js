const ViewAlignedPlaneRectShader = {
    vsSrc:
    `#version 300 es
	in vec3 pos;
	uniform float xDim;
	uniform float yDim;
	uniform float zDim;
	uniform float t0;
	uniform float dt;
	uniform int lastIndex;
	uniform vec3 translationDirection;
	uniform mat4 M_DATA_SPACE;
	uniform mat4 M_CLIP_SPACE;
	out vec3 texCoord;

	void main(void) { 
		if(gl_InstanceID <= lastIndex) {
			float translateAmount = t0 + float(gl_InstanceID)*dt;
			vec3 translated = translationDirection * translateAmount + pos;
			
			vec3 dataSpacePos = (M_DATA_SPACE * vec4(
				translated.x,
				translated.y,
				translated.z,
				1.0
			)).xyz;
			texCoord = vec3( 
				dataSpacePos.x/xDim,
				dataSpacePos.y/yDim,
				dataSpacePos.z/zDim
			);
			

			gl_Position = M_CLIP_SPACE * vec4(      
				translated.x,
				translated.y,                   
				translated.z,                   
				1.0                  
			); 
		}
    }`
    ,
    fsSrc:
    `#version 300 es
	precision highp float;
	precision highp float;

    uniform highp sampler3D volSampler;
	uniform highp sampler2D colSampler;
	uniform highp sampler2D opcSampler;
	uniform float dataMin;
	uniform float dataMax;
	uniform float alphaScale;
	out vec4 fragColor;
	in vec3 texCoord;
	void main(void) {
		if(texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0 || texCoord.z < 0.0 || texCoord.z > 1.0) { discard; }
		float dataValue = texture(volSampler, texCoord).r;

		float normDataValue = (dataValue - dataMin) / (dataMax - dataMin);
		vec3 color = texture(colSampler, vec2(normDataValue, 0.5)).rgb;
		float opacity = texture(opcSampler, vec2(normDataValue, 0.5)).r;
		opacity = alphaScale + (1.0-opacity)*alphaScale;
		fragColor = vec4(color,opacity); 	
		//fragColor = vec4(255, 255, 255, 0.5);
    }`
}