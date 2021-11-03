// A very basic shader program for 2d rendering
// note that we set the OpenGL ES Shader language to 3.00 
// this is important so that we will be able to use textures
// for the future assignments
// also note than version 3 we must use the keyword "in" rather than "attribute"

const basicVertSrc =
   `#version 300 es 
   in vec2 pos;
   uniform mat4 M;
   void main(void) {            
       gl_Position = M * vec4(      
           pos.x,                   
           pos.y,                   
           0,                   
           1.0                  
        );         
    }`;

// OpenGL ES Shader language 3.00 wants you to specify the floating point precision
// Also this version of the shader language requires the output of the fragment shader
// do be declared as an out variable (gl_FragColor was depreciated)

const basicFragSrc = 
   `#version 300 es
    precision highp float;
    uniform vec4 color;
    out vec4 fragColor;
    void main(void) {
        fragColor = color;
    }`;

// WebGLView inherits from the Widget class, and adds two layers, a canvas2d and WebGL canvas
// We will put the canvas2d layer on top of the WebGL layer and use it for things like text rendering 

class WebGLView extends Widget {

    constructor( idPrefix, parent, x = 0.0, y = 0.0, width = 400.0, height = 400.0 ) {
        
        // must call the base class's (Widget's) constructor 

        super( idPrefix, parent, x, y, width, height);

        /////////////////////////////////////////////////////////////////

        let cont = document.querySelector( this.getSelector() );

        // create the canvas element and add it to the container

        let glCanvas = document.createElement( 'canvas' );
        glCanvas.setAttribute( 'id', this.id + '_canvas' );
        cont.append( glCanvas );

        // set some of its properties

        this.glCanvas = document.querySelector( "#" + this.id + "_canvas" );
        this.glCanvas.width  = width;
        this.glCanvas.height = height;
        this.glCanvas.style.width  =  width + "px";
        this.glCanvas.style.height = height + "px";
        this.glCanvas.style.left = "0px";
        this.glCanvas.style.top  = "0px";
        this.glCanvas.style.position  = "absolute";

        // do the same for the other canvas

        let canvas2d = document.createElement( 'canvas' );
        canvas2d.setAttribute( 'id', this.id + '_canvas2d' );
        cont.append( canvas2d );

        this.canvas2d = document.querySelector( "#" + this.id + "_canvas2d" );

        this.canvas2d.width  = width;
        this.canvas2d.height = height;

        this.canvas2d.style.width  =  width + "px";
        this.canvas2d.style.height = height + "px";

        this.canvas2d.style.left = "0px";
        this.canvas2d.style.top  = "0px";
        this.canvas2d.style.position  = "absolute";

        // append the canvases to the container with canvas2d on top

        cont.append( glCanvas );
        cont.append( canvas2d );

        // from each of the canvas elements, establish a context //////////

        // Establish the WebGL 2.0 context. Using version 2.0 instead of 1.0 is important
        // because in version 2 they added 3D texture support, which will be used for our 
        // future assignments

        this.gl  = this.glCanvas.getContext( "webgl2",  { antialias: true } );

        // Make sure the context was established

        if ( this.gl === null) {
          window.alert( "Failed to initialize a WebGL 2.0 context." );
          return null;
        }    

        // the 2d canvas

        this.ctx = this.canvas2d.getContext( "2d" );

        if( this.ctx === null )
        {
          window.alert( "Failed to initialize a Canvas 2d context." );
          return null;
        }

        this.initGL();

        return this;
    }

    initGL()
    {
        // each time you use a WebGL function, you call it from the context (this.gl)

        var gl = this.gl;

        // set some WebGL state properties

        gl.disable( gl.DEPTH_TEST);
        gl.enable( gl.BLEND );
        gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // create some buffers

        this.vertexBuffer = gl.createBuffer();
        this.indexBuffer  = gl.createBuffer();

        //compile our shaders

        // the vertex shader

        var vertShader = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( vertShader, basicVertSrc );
        gl.compileShader(vertShader );
        var message = gl.getShaderInfoLog( vertShader );
        
        if( message.length > 0) 
        {
            throw message;
        }

        // the fragment shader

        var fragShader = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( fragShader, basicFragSrc );
        gl.compileShader(fragShader);
        var message = gl.getShaderInfoLog( fragShader );
        
        if (message.length > 0) 
        {
            throw message;
        }

        // the program that links the vertex and fragment shaders

        this.basicShader = gl.createProgram();
        gl.attachShader( this.basicShader, vertShader  ); 
        gl.attachShader( this.basicShader, fragShader );
        gl.linkProgram(  this.basicShader );

        if ( ! gl.getProgramParameter( this.basicShader, gl.LINK_STATUS ) ) 
        {
            window.alert( 'Shader program failed : ' 
                + gl.getProgramInfoLog( this.basicShader ) );
        }
    }

    // a helper function and example, how to draw lines on the canvas 2d layer

    drawLines( lines, color, width )
    {
        var ctx = this.ctx;
        ctx.save();

        ctx.lineWidth = width;
        ctx.strokeStyle = 'rgb(' 
            + color[ 0 ] * 255 + ',' 
            + color[ 1 ] * 255 + ',' 
            + color[ 2 ] * 255 + ')';

        for( var i = 0; i < lines.length; ++i )
        {
            var line = lines[ i ];
            ctx.beginPath();
            for( var j = 0; j < line.length - 1; ++j )
            {
                var pointA = line[ j     ];
                var pointB = line[ j + 1 ];
                ctx.moveTo( pointA[ 0 ], pointA[ 1 ] );
                ctx.lineTo( pointB[ 0 ], pointB[ 1 ] );
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }

    // an example 2d render function that is usefull for plotting
    // vertices should be an array of 2d points
    // bounding box should represent the values in data space that the corners
    // of the image should be
    // mode should be gl.LINE_STRIP, gl.TRIANGLES, etc, which remembers is accessed from the context

    render2d( vertices, boundingBox, color, mode, viewport)
    {
        var gl = this.gl;   
 
        // update the vertex buffer 

        gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
        gl.bufferData(
            gl.ARRAY_BUFFER,
            vertices,
            gl.DYNAMIC_DRAW
        );
        gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3])
        // Transformation matrices to go from data space to screen space for the 2d projection
        // remember matrices must be multiplied in the reverse of the logical order

        const xMin = boundingBox.xMin;
        const yMin = boundingBox.yMin;

        const xMax = boundingBox.xMax;
        const yMax = boundingBox.yMax;

        const M = glMatrix.mat4.create();
        
        // then scale to fall between (-1.0,1.0), which is the boundaries in screen space
        //console.log(M)
        glMatrix.mat4.scale( M, M, [ 
            2.0 / ( xMax - xMin ), 
            2.0 / ( yMax - yMin ), 
            1.0 ] );
        // first center the data at (0,0)
        //console.log(M)

        glMatrix.mat4.translate( M, M, [ 
            -( xMin + xMax ) / 2.0, 
            -( yMin + yMax ) / 2.0, 
            0.0 ] );
            //console.log(M)

        // Tell WebGL which shader program we will use        

        gl.useProgram(  this.basicShader );

        // set the uniforms (these are constants inside the shader)

        gl.uniformMatrix4fv( 
            gl.getUniformLocation( this.basicShader, "M" ), 
            false, 
            M ); 

        gl.uniform4fv( 
            gl.getUniformLocation( this.basicShader, "color" ), 
            color ); 

        // bind the vertex buffer to the "pos" attribute in the shader program

        gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
        var posAttr = gl.getAttribLocation( this.basicShader, "pos" );

        // tell WebGL it has 2 points per vertex, of type float, don't normalize them, 
        // there are no gaps between points, and start at the beginning

        gl.vertexAttribPointer( posAttr, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( posAttr );

        // finally do the draw call, vertices is 
        // an array that looks like [ p0.x, p0.y, p1.x, p1.y, ..., pn.x, pn.y ]
        // so the number of elements (vertices) is vertices.length / 2

        gl.drawArrays( mode, 0, vertices.length / 2 );     
        // not really necessary in this program, but if you had different render functions not using this 
        // attribute array, then it would be important to disable it

        gl.disableVertexAttribArray( posAttr );       
    }

    // getters //////////////////////////////////////////////////////////////////

    canvasWidth()
    {
        return this.glCanvas.width;
    }

    canvasHeight()
    {
        return this.glCanvas.height;
    }

    // setters ///////////////////////////////////////////////////////////////////

    // overides Widget.setSize
    
    setSize( width, height )
    {
        // call base class's setSize function
        super.setSize( width, height );

        this.glCanvas.width = width;
        this.glCanvas.height = height;

        this.glCanvas.style.width  =  width + "px";
        this.glCanvas.style.height = height + "px";

        this.canvas2d.width = width;
        this.canvas2d.height = height;

        this.canvas2d.style.width  =  width + "px";
        this.canvas2d.style.height = height + "px";
        
        this.gl.viewport( 0, 0, this.glCanvas.width, this.glCanvas.height );    

        return this;
    }
    clearCanvas() {
        const context = this.ctx

        context.clearRect(0, 0, this.glCanvas.width, this.glCanvas.height);
    }
    clear( color )
    {
        var gl = this.gl;     

        gl.clearColor( 
            color[ 0 ], 
            color[ 1 ], 
            color[ 2 ],             
            1.0 );

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.clearDepth(1.0); 

        return this;
    }
}
