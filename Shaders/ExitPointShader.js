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
    
    in vec3 texCoord;
    void main(void) {
        //exitPoint = vec4(0.5,0.5,0.5,1);
         exitPoint = vec4(texCoord,1);
    }`
    

}