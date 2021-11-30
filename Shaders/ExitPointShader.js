const ExitPointShader = {
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
	
    }`
    ,
    fsSrc:
    `#version 300 es
    precision highp float;
    
    out vec4 exitPoint;
    uniform highp sampler2D depthSampler;
	uniform int flag;
	uniform int width;
	uniform int height;
	uniform int skipMode;
	uniform float near;
	uniform float far;
    in vec3 texCoord;
    void main(void) {
		if(skipMode == 1) {
			vec2 fragPos = gl_FragCoord.xy;
			vec2 normalizedFragPos = fragPos / vec2(width, height);
			float depth = texture(depthSampler, normalizedFragPos).r;
			
			float z = gl_FragCoord.z;
			
			if(flag == 1) { // exit
				if(z < depth) discard;			
			} else { // entry
				if(z > depth) discard;
			}
		}

        exitPoint = vec4(texCoord,1);
    }`
    

}