const CutPlaneShader = {
    vsSrc:
    `#version 300 es
	in vec3 pos;
	uniform mat4 MVP;
	uniform float xDim;
	uniform float yDim;
	uniform float zDim;
	
	out vec3 texCoord;

	void main(void) { 
		texCoord = vec3(
			pos.x/xDim,
			pos.y/yDim,
			pos.z/zDim
		);
		gl_Position = MVP * vec4(      
			pos.x,
			pos.y,                   
			pos.z,                   
			1.0                  
		); 
    }`,
    fsSrc:
    `#version 300 es
	precision highp float;

    uniform highp sampler3D volumeTextureSampler;
	uniform highp sampler2D colorTextureSampler;
	uniform float dataMin;
	uniform float dataMax;
	out vec4 fragColor;
	in vec3 texCoord;
	void main(void) {
		float dataValue = texture(volumeTextureSampler, texCoord).r;

		 float normDataValue = (dataValue - dataMin) / (dataMax - dataMin);
		 vec3 color = texture(colorTextureSampler, vec2(normDataValue, 0.5)).rgb;
		//  if(color.a > 0.0) {
		// 	 color.rgb /= color.a;
		//  }
		 fragColor = vec4(color.rgb,1);
    }`
}