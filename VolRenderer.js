
// basic shader for 3d rendering ////////////////////////////////////////////////////////////////

const basicVs3dSrc = 
  `#version 300 es
   in vec3 pos;
   uniform mat4 MVP;
   void main(void) {            
        gl_Position = MVP * vec4(      
           pos.x,
           pos.y,                   
           pos.z,                   
           1.0                  
        ); 
    }`;

const basicFs3dSrc = 
   `#version 300 es
	precision highp float;
    out vec4 fragColor;
    uniform vec4 color;
    void main(void) {
        fragColor = color;
    }`;

/// // TODO Shaders for Cutting Planes /////////////////////////////////////////////////////////////////////

const cutPlaneVsSrc = 
  `#version 300 es
	in vec3 pos;
	uniform mat4 MVP;
	uniform float xDim;
	uniform float yDim;
	uniform float zDim;
	
	//out vec3 texCoord;
	out vec2 texCoord;
	void main(void) { 
		// texCoord = vec3(
		// 	pos.x/xDim,
		// 	pos.y/yDim,
		// 	pos.z/zDim
		// );
		texCoord = vec2(
				pos.x/xDim,
				pos.y/yDim
			);
		gl_Position = MVP * vec4(      
			pos.x,
			pos.y,                   
			pos.z,                   
			1.0                  
		); 
    }`;

const cutPlaneFsSrc = 
   `#version 300 es
	precision highp float;

    uniform highp sampler3D volumeTextureSampler;
	uniform highp sampler2D colorTextureSampler;
	uniform float dataMin;
	uniform float dataMax;
	out vec4 fragColor;
	//in vec3 texCoord;
	in vec2 texCoord;
	void main(void) {
		fragColor = vec4(texture(colorTextureSampler, texCoord).rgb,1);
		//float dataValue = texture(volumeTextureSampler, texCoord).r;
		 //float normDataValue = (dataValue - dataMin) / (dataMax - dataMin);
		 //vec3 color = texture(colorTextureSampler, vec2(normDataValue, 0.5)).rgb;
		 //fragColor = vec4(color,1);
    }`;

////////////////////////////////////////////////////////////////////////////////////////////////////////////

class VolRenderer {

	static nextId = 0;

	compileShader( vsSrc, fsSrc )
	{
		var gl = this.gl;

		var vs = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( vs, vsSrc );
        gl.compileShader( vs );
        var message = gl.getShaderInfoLog( vs );
        if( message.length > 0) {
            throw message;
        }

        var fs = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( fs, fsSrc );
        gl.compileShader( fs );
        message = gl.getShaderInfoLog( fs );
        if (message.length > 0) {
            throw message;
        }

        var program = gl.createProgram();
        gl.attachShader( program, vs  ); 
        gl.attachShader( program, fs );
        gl.linkProgram(  program );
        if ( ! gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
            window.alert( 'Shader program failed: ' 
                + gl.getProgramInfoLog( program ) );
        }

        return program;
	}

	constructor()
	{
        this.glCanvas = document.createElement( 'canvas' );
        this.id = "VolRenderer_" + VolRenderer.nextId++;
        this.glCanvas.setAttribute( 'id', this.id );

        this.gl = this.glCanvas.getContext( "webgl2", { antialias: true } );
        var gl = this.gl;

		const ext = gl.getExtension("EXT_color_buffer_float");
		if (!ext) {
		    console.error( "Extension 'EXT_color_buffer_float' not supported" );
		    return;
		}

		const ext2 = gl.getExtension( 'OES_texture_float_linear' );
		if (!ext2) {
		    console.error( "Extension 'OES_texture_float_linear' not supported" );
		    return;
		}

        // Only continue if WebGL is available and working
        if ( gl === null) {
          window.alert( "Unable to initialize WebGL." );
          return null;
        }    

        // textures

        this.volTex = gl.createTexture();
        this.colTex = gl.createTexture();
        this.opcTex = gl.createTexture();        
	
        // buffers

        this.vertexBuffer = this.gl.createBuffer();

        // shaders for simple 3d rendering (bounding boxes axis, etc)

        this.basicShaderProgram = this.compileShader( basicVs3dSrc, basicFs3dSrc );
		const alignment = 1;
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);
		
        // TODO shaders for rendering the cutting planes
        this.cuttingPlaneShaderProgram = this.compileShader( cutPlaneVsSrc, cutPlaneFsSrc );

        return this;
	}

	render(  
		viewWidth, 
		viewHeight, 
		vertices,
		MVP,
		color,
		mode,
		lineWidth )
	{
		var gl = this.gl;

		this.glCanvas.width  = viewWidth;
		this.glCanvas.height = viewHeight;

		gl.viewport( 0, 0, viewWidth, viewHeight );

		gl.lineWidth( lineWidth );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW, 0 );

		gl.useProgram( this.basicShaderProgram );

		gl.uniform4fv( 
			gl.getUniformLocation( this.basicShaderProgram, "color" ), 
			color );

		gl.uniformMatrix4fv( 
			gl.getUniformLocation( this.basicShaderProgram, "MVP" ), 
			false, 
			MVP ); 

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );

		var posAttr = gl.getAttribLocation( this.basicShaderProgram, "pos" );
		gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( posAttr );
		
		gl.drawArrays( 
			mode, 
			0, 
			vertices.length / 3 );   
		
		gl.disableVertexAttribArray( posAttr );  
		   
    }

    // TODO
	renderCuttingSurface( 
		viewWidth, 
		viewHeight, 
		surfaceVertices, 
        dataSpaceToClipSpaceMatrix,
		dims )
	{
		var gl = this.gl

		this.glCanvas.width  = viewWidth;
		this.glCanvas.height  = viewHeight;

		gl.useProgram(  this.cuttingPlaneShaderProgram );

		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_3D, this.volTex );

		gl.activeTexture( gl.TEXTURE1 );
		gl.bindTexture( gl.TEXTURE_2D, this.colTex );
		gl.viewport( 0, 0, viewWidth, viewHeight );


		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, surfaceVertices, gl.DYNAMIC_DRAW, 0 );

		gl.uniformMatrix4fv( 
			gl.getUniformLocation( this.cuttingPlaneShaderProgram, "MVP" ), 
			false, 
			dataSpaceToClipSpaceMatrix );		
		gl.uniform1f(
			gl.getUniformLocation( this.cuttingPlaneShaderProgram, "xDim"),
			dims[0]
		)
		gl.uniform1f(
			gl.getUniformLocation( this.cuttingPlaneShaderProgram, "yDim"),
			dims[1]
		)
		gl.uniform1f(
			gl.getUniformLocation( this.cuttingPlaneShaderProgram, "zDim"),
			dims[2]
		)
		gl.uniform1f(
			gl.getUniformLocation( this.cuttingPlaneShaderProgram, "dataMin"),
			this.dataMin
		)
		gl.uniform1f(
			gl.getUniformLocation( this.cuttingPlaneShaderProgram, "dataMax"),
			this.dataMax
		)
		gl.uniform1i( gl.getUniformLocation( this.cuttingPlaneShaderProgram, "volumeTextureSampler" ), 0 );
		gl.uniform1i( gl.getUniformLocation( this.cuttingPlaneShaderProgram, "colorTextureSampler" ), 1 );


		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		var posAttr = gl.getAttribLocation( this.cuttingPlaneShaderProgram, "pos" );
		gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( posAttr );

		gl.drawArrays( 
			gl.TRIANGLES, 
			0, 
			surfaceVertices.length / 3 );   
		

		gl.disableVertexAttribArray( posAttr );  
		
	}

    clear( r, g, b, width, height )
    {
		this.glCanvas.width = width;
		this.glCanvas.height = height;

        var gl = this.gl;     
        gl.clearColor( 
            r, 
            g, 
            b,             
            1.0 );

        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    }

	getContext()
	{
		return this.gl;
	}

	getCanvas()
	{
		return this.glCanvas;
	}

	setOpacityTF( opacityTF )
	{
		var gl = this.gl;

		gl.activeTexture( gl.TEXTURE2 );
		gl.bindTexture( gl.TEXTURE_2D, this.opcTex );
		gl.texImage2D(
			gl.TEXTURE_2D,     // texture type
		    0,                 // level
			gl.R32F,           // internalFormat
			opacityTF.length,  // width
			1,                 // height
			0,                 // border
			gl.RED,            // format
			gl.FLOAT,          // type
			new Float32Array( opacityTF ) );       // data

		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
        gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );

		return this;
	}

	setColorTF( colorTF )
	{
		
		var gl = this.gl;

		// gl.activeTexture( gl.TEXTURE1 );		

		// gl.bindTexture( gl.TEXTURE_2D, this.colTex );
		// gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

		// gl.texImage2D(
		// 	gl.TEXTURE_2D,     // texture type
		//     0,                 // level
		// 	gl.RGB32F,           // internalFormat
		// 	colorTF.length/3,  // width
		// 	1,                 // height
		// 	0,                 // border
		// 	gl.RGB,            // format
		// 	gl.FLOAT,          // type
		// 	new Float32Array( colorTF ));       // data

		// gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		// gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
        // gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		// gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		
		// Fill the texture with a 1x1 blue pixel.
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
					new Uint8Array([0, 0, 255, 255]));
		
		// Asynchronously load an image
		var image = new Image();
		image.src = "resources/xxs.png";
		image.addEventListener('load', function() {
		// Now that the image has loaded make copy it to the texture.
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
			gl.generateMipmap(gl.TEXTURE_2D);
		});

		return this;
	}

	setTF( colorTF, opacityTF )
	{
		this.setColorTF( colorTF );
		this.setOpacityTF( opacityTF );

		return this;
	}

	setData( data, dims, type, min, max )
	{
		var gl = this.gl;

		this.dims = dims;
		this.type = type;

		this.dataMax = max;
		this.dataMin = min;
		// TODO use texImage3d to load the data into the texture
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_3D, this.volTex );
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
		var glType, internalFormat, format;
		switch(type) {
			case 'FLOAT':
				glType = gl.FLOAT;
				internalFormat = gl.R32F;
				format = gl.RED;
				break;
			case 'BYTE':
				glType = gl.BYTE;
				internalFormat = gl.R8I;
				format = gl.RED_INTEGER;
				break;
			case 'SHORT':
				glType = gl.SHORT;
				internalFormat = gl.R16I;
				format = gl.RED_INTEGER;
				break;
			default:
				glType = gl.FLOAT;
				internalFormat = gl.R32F;
				format = gl.RED;
				break;
		}
		gl.texImage3D(
			gl.TEXTURE_3D,     // texture type
		    0,                 // level
			internalFormat,           // internalFormat
			dims[0],  			// width
			dims[1],        	// height
			dims[2],		    //depth
			0,                 // border
			format,            // format
			glType,          	   // type
			new Float32Array(data));  

		gl.texParameterf( gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameterf( gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
		// only floating point textures currently support linear filtering/interpolation 
		if( type == "FLOAT" )
		{
			// set TEXTURE_MIN_FILTER, and TEXTURE_MAG_FILTER parameters for the floating point
			// texture to linear
		
			gl.texParameterf( gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
			gl.texParameterf( gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		}
		else
		{
			// nearest neighbor interpolation when sampling texture
			gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
  			gl.texParameteri( gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
		}

		return this;
	}

	enableDepthTest()
	{
		var gl = this.gl;
		gl.enable( gl.DEPTH_TEST );
	}

	disableDepthTest()
	{
	    var gl = this.gl;
		gl.disable( gl.DEPTH_TEST );
	}
}
