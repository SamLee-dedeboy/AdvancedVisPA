const BasicShader = { 
    vsSrc: 
    `#version 300 es
   in vec3 pos;
   uniform mat4 MVP;
   uniform float pointSize;
   void main(void) {            
        gl_Position = MVP * vec4(      
           pos.x,
           pos.y,                   
           pos.z,                   
           1.0                  
        ); 
		gl_PointSize = pointSize;
    }`,
    fsSrc:
   `#version 300 es
	precision highp float;
    out vec4 fragColor;
    uniform vec4 color;
    void main(void) {
        fragColor = color;
    }`

}