const DepthShader = {
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

    uniform float near;
    uniform float far;
    uniform int flag;
    out vec4 depthVec;
    in vec3 texCoord;

    float frac(float x) {
        return x - floor(x);
    }
    void main(void) {
        // float ndc = gl_FragCoord.z * 2.0 - 1.0;
        // float linearDepth = (2.0 * near * far) / (far + near - ndc * (far - near));
        // float z = linearDepth;
        //float z = (1.0/gl_FragCoord.z - 1.0/near)/(1.0/far - 1.0/near);
        float z = gl_FragCoord.z;
        //depthVec = vec4(z, frac(z*256.0), frac(z*256.0*256.0), 1);
        
        depthVec = vec4(z, 0, 0, 0.5);
       
    }`
    

}