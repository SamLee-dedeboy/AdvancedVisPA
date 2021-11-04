
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

/// // TODO INTEGRATE FROM A2 Shaders for Cutting Planes //////////////////////

const cutPlaneVsSrc = 
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
    }`;

const cutPlaneFsSrc = 
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
    }`;

/// TODO Shaders for Texture Based Volume Rendering ////////////////////////////

const viewAlignedPlaneInstancedVsSrc = 
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
    }`;

const viewAlignedPlaneInstancedFsSrc = 
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
    }`;
const viewAlignedPlaneVsSrc = 
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
		v_surfaceToLight = lightWorldPosition - worldSpacePos;
		v_surfaceToCam = camWorldPosition - worldSpacePos;
	}`;
const viewAlignedPlaneFsSrc = 
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
	uniform highp sampler3D volSampler;
	uniform highp sampler2D colSampler;
	uniform highp sampler2D opcSampler;
	uniform float dataMin;
	uniform float dataMax;
	uniform float alphaScale;

	out vec4 fragColor;

	void main(void) {
		//if(texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0 || texCoord.z < 0.0 || texCoord.z > 1.0) { discard; }
		float light = 1.0;
		float specular = 0.0;
		if(doLighting == 1) {
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
			//v_normal_x /= (2.0*h_x);
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
			//v_normal_y /= (2.0*h_y);
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
			//v_normal_z /=  (2.0*h_z);
			
			vec3 v_normal = vec3(v_normal_x, v_normal_y, v_normal_z);
			vec3 normal = normalize(v_normal);
			vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
			vec3 surfaceToCamDirection = normalize(v_surfaceToCam);
			vec3 halfVector = normalize(surfaceToLightDirection + surfaceToCamDirection);
			light = dot(normal, surfaceToLightDirection );
			specular = dot(normal, halfVector);
		}
		float dataValue = texture(volSampler, texCoord).r;
		float normDataValue = (dataValue - dataMin) / (dataMax - dataMin);
		float opacity = texture(opcSampler, vec2(normDataValue, 0.5)).r;

		vec3 color = texture(colSampler, vec2(normDataValue, 0.5)).rgb;
		opacity = opacity*alphaScale;
		color.rgb *= light;
		color.rgb += specular;
		//fragColor = color;
		fragColor = vec4(color, opacity);
	}`;
const exitPointVsSrc = 
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
    }`;
const exitPointFsSrc = 
`#version 300 es
precision highp float;

out vec4 exitPoint;
in vec3 texCoord;
void main(void) {
	//exitPoint = vec4(0.5,0.5,0.5,1);
	 exitPoint = vec4(texCoord,1);
}`;
const rayCastingVsSrc = 
`#version 300 es
	in vec3 pos;
	uniform mat4 M_DATA_TO_CLIP_SPACE;
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
		gl_Position = M_DATA_TO_CLIP_SPACE * vec4(      
			pos.x,
			pos.y,                   
			pos.z,                   
			1.0                  
		); 
    }`;
const rayCastingFsSrc = 
`#version 300 es
precision highp float;

uniform highp sampler3D volSampler;
uniform highp sampler2D exitPointSampler;
uniform highp sampler2D colSampler;
uniform highp sampler2D opcSampler;

uniform float xDim;
uniform float yDim;
uniform float zDim;
uniform float sampleDistance;
uniform float dataMin;
uniform float dataMax;
uniform int width;
uniform int height;
out vec4 fragColor;
in vec3 texCoord;
void main(void) {
	vec2 fragPos = gl_FragCoord.xy;
	vec2 normalizedFragPos = fragPos / vec2(width, height);
	vec3 entryPoint = texCoord;
	vec3 exitPoint = texture(exitPointSampler, normalizedFragPos.xy).xyz;
	vec3 dims = vec3(xDim, yDim, zDim);

	vec3 fullRay = (exitPoint - entryPoint) * dims;
	vec3 rayDirection = normalize(fullRay);

	float totalDistance = length(fullRay);
	int nSample = int(totalDistance/sampleDistance);
	vec3 t0 = entryPoint * dims;
	vec3 rayPos = t0;
	vec3 dstColor = vec3(0,0,0);
	float dstAlpha = 0.0;
	vec3 newTexCoord = texCoord;
	for(int i = 0; i < nSample; i++) {
		newTexCoord = rayPos/dims;
		float dataValue = texture(volSampler, newTexCoord).r;
		float normDataValue = (dataValue - dataMin) / (dataMax - dataMin);
		float opacity = texture(opcSampler, vec2(normDataValue, 0.5)).r;
		vec3 color = texture(colSampler, vec2(normDataValue, 0.5)).rgb;
		dstAlpha += (1.0-dstAlpha)*opacity;
		dstColor += (1.0-dstAlpha)*opacity*color;

		rayPos += rayDirection * sampleDistance;
	}
	fragColor = vec4(dstColor, dstAlpha);
}`;
//////////////////////////////////////////////////////////////////////////////////

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

        this.gl = this.glCanvas.getContext( "webgl2", { antialias: true} );
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
		this.exitPointTexture = gl.createTexture();

        // buffers
		this.renderTextureFrameBuffer = this.gl.createFramebuffer();
        this.vertexBuffer = this.gl.createBuffer();
        // shaders for simple 3d rendering (bounding boxes axis, etc)

        this.basicShaderProgram = this.compileShader( basicVs3dSrc, basicFs3dSrc );

        // TODO compile shaders for rendering the cutting planes

        this.cuttingPlaneShaderProgram = this.compileShader( cutPlaneVsSrc, cutPlaneFsSrc );

        // TODO compile shader for rendering view aligned polygones for texture based volume rendering
        
        this.textureBasedVolumeRenderShader = this.compileShader( viewAlignedPlaneInstancedVsSrc, viewAlignedPlaneInstancedFsSrc );
		this.raycastingVolumeRenderShader = this.compileShader(rayCastingVsSrc, rayCastingFsSrc);
		this.viewAlignedVolumeRenderShader = this.compileShader(viewAlignedPlaneVsSrc, viewAlignedPlaneFsSrc);
        this.exitPointShaderProgram = this.compileShader(exitPointVsSrc, exitPointFsSrc)
		return this;
	}

	render(  
		viewWidth, 
		veiwHeight, 
		vertices,
		MVP,
		color,
		mode,
		lineWidth )
	{
		var gl = this.gl;

		this.glCanvas.width  = viewWidth;
		this.glCanvas.height = veiwHeight;

		gl.viewport( 0, 0, viewWidth, veiwHeight );

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
	renderRayCastingVolume(viewWidth,
		viewHeight, 
		cameraPosVec,
		cameraUpVec,	
		bboxFacesDataSpace,
		bboxCornersWorldSpace,
		dataSpaceToClipSpace,
		worldSpaceToClipSpace,
		worldSpaceToDataSpace,
		dims,
		doLighting,
		sampleDistance) {
			// construct and calculate all attributes
			// vector pointing from (0,0,0) in world space to the camera position
			var normalVec = glMatrix.vec3.create();
			glMatrix.vec3.normalize( normalVec, cameraPosVec );
			glMatrix.vec3.scale( normalVec, normalVec, 1.0 );
			var translationDirection = normalVec;
	
	
			var upVector = cameraUpVec;
			glMatrix.vec3.normalize( upVector, upVector );
	
			// camera right vector
			var rightVec = glMatrix.vec3.create();
			glMatrix.vec3.cross( rightVec, upVector, normalVec );
			glMatrix.vec3.normalize( rightVec, rightVec );
			//console.log(sampleDistance)
			var alphaScale = sampleDistance;
			var maxDim = Math.max( Math.max( dims[ 0 ], dims[ 1 ] ), dims[ 2 ] );
	
			// the spacing between the planes in world space
			// divide by maxDim, as this is the way our world space is normalized
			var dt = sampleDistance / maxDim;
			// the data is centered at (0,0,0) in worldspace, so distance to the camera is the length its position vector
			var camDist = glMatrix.vec3.length( cameraPosVec );
			
			// wMax, wMin are the closest and furthest distances from the view aligned plane at the camera position
			// dw is the distance in world space between the closest and furtherest corner of the bounding box
			var wMax = -Infinity;
			var wMin = Infinity;
			var frontIndex = 0;
			for(var i = 0; i < bboxCornersWorldSpace.length; i++) {
				var distVec = glMatrix.vec3.create();
				glMatrix.vec3.subtract(distVec, cameraPosVec, glMatrix.vec3.fromValues(bboxCornersWorldSpace[i][0], bboxCornersWorldSpace[i][1], bboxCornersWorldSpace[i][2]))
				var dist = glMatrix.vec3.length(distVec);
				if(dist > wMax) {
					wMax = dist;
				}
				if(dist < wMin) {
					wMin = dist;
					frontIndex = i;
				}
			}
			var dW = ( wMax - wMin );
	
			// the number of samples will be that distance divided by the spacing between planes
			var NSample = dW / dt;
			
			// the amount of translation for the furthest plane (we're rendering back to front)
			// wMax - camDist gives us the distance between the furthest point and the base plane
			// we want to start this far back, so it is negative
			var t0 = -( wMax - camDist );
	
		
	
			var bboxV2 = bboxCornersWorldSpace[2];
			var bboxV3 = bboxCornersWorldSpace[3];
			var lightWorldPosition = glMatrix.vec3.fromValues((bboxV2[0] + bboxV3[0])/2-1, (bboxV2[1] + bboxV3[1])/2, (bboxV2[2] + bboxV3[2])/2)
			glMatrix.vec3.negate(lightWorldPosition,lightWorldPosition);
	
			this.renderBackfaces(
				viewWidth, 
				viewHeight, 
				bboxFacesDataSpace, 
				dataSpaceToClipSpace, 
				dims)
			
			let gl = this.gl;
			let sp = this.raycastingVolumeRenderShader;
			
			this.glCanvas.width  = viewWidth;
			this.glCanvas.height = viewHeight;
	
			gl.viewport( 0, 0, viewWidth, viewHeight );
			gl.enable( gl.DEPTH_TEST );
			gl.depthFunc( gl.LESS );
			gl.depthMask( false );
			gl.enable( gl.BLEND );
			gl.blendFuncSeparate(
				gl.SRC_ALPHA, 
				gl.ONE_MINUS_SRC_ALPHA, 
				gl.ONE,
				gl.ONE_MINUS_SRC_ALPHA
			);
			
			gl.enable(gl.CULL_FACE);
			gl.cullFace(gl.BACK);
	
			gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, bboxFacesDataSpace, gl.DYNAMIC_DRAW, 0 );
	
			gl.useProgram(  sp );
			
			gl.uniform1i( gl.getUniformLocation( sp, "volSampler" ), 0 );
			gl.uniform1i( gl.getUniformLocation( sp, "colSampler" ), 1 );
			gl.uniform1i( gl.getUniformLocation( sp, "opcSampler" ), 2 );
			gl.uniform1i( gl.getUniformLocation( sp, "exitPointSampler"), 3);
			
			gl.uniform1f( gl.getUniformLocation( sp, "sampleDistance" ), sampleDistance );
			gl.uniform1i( gl.getUniformLocation(sp, "width"), viewWidth);
			gl.uniform1i( gl.getUniformLocation(sp, "height"), viewHeight);

			gl.uniform3fv( gl.getUniformLocation( sp, "lightWorldPosition" ), new Float32Array( lightWorldPosition ) );
			gl.uniform3fv( gl.getUniformLocation( sp, "camWorldPosition" ), new Float32Array( cameraPosVec ) );
	
			
			gl.activeTexture( gl.TEXTURE0 );
			gl.bindTexture( gl.TEXTURE_3D, this.volTex );
	
			gl.activeTexture( gl.TEXTURE1 );
			gl.bindTexture( gl.TEXTURE_2D, this.colTex );
	
			gl.activeTexture( gl.TEXTURE2 );
			gl.bindTexture( gl.TEXTURE_2D, this.opcTex );
	
			gl.uniform1f( gl.getUniformLocation( sp, "dataMin" ), this.dataMin );
			gl.uniform1f( gl.getUniformLocation( sp, "dataMax" ), this.dataMax );
	
			gl.uniform1f( gl.getUniformLocation( sp, "xDim" ), dims[ 0 ] );
			gl.uniform1f( gl.getUniformLocation( sp, "yDim" ), dims[ 1 ] );
			gl.uniform1f( gl.getUniformLocation( sp, "zDim" ), dims[ 2 ] );
	
			gl.uniform1f( gl.getUniformLocation( sp, "alphaScale" ), alphaScale );
			gl.uniform1i( gl.getUniformLocation( sp, "doLighting" ), doLighting ? 1 : 0 );
	
			gl.uniformMatrix4fv( 
				gl.getUniformLocation( sp, "M_WORLD_TO_DATA_SPACE" ), 
				false, 
				worldSpaceToDataSpace ); 
	
			gl.uniformMatrix4fv( 
				gl.getUniformLocation( sp, "M_WORLD_TO_CLIP_SPACE" ), 
				false, 
				worldSpaceToClipSpace ); 
			gl.uniformMatrix4fv(
				gl.getUniformLocation( sp, "M_DATA_TO_CLIP_SPACE"),
				false,
				dataSpaceToClipSpace );
			
			
			
			
			gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
	
			var posAttr = gl.getAttribLocation( sp, "pos" );
	
			gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( posAttr );
	
	
			gl.drawArrays(
				gl.TRIANGLES, 
				0, 
				bboxFacesDataSpace.length/3, 
			);
			gl.disableVertexAttribArray( posAttr );     
	}
	renderBackfaces(
		viewWidth, 
		viewHeight, 
		surfaceVertices, 
        dataSpaceToClipSpaceMatrix,
		dims) 	
	{
		var gl = this.gl

		this.glCanvas.width  = viewWidth;
		this.glCanvas.height  = viewHeight;
		this.setExitPointTexture(viewWidth, viewHeight);

		gl.bindFramebuffer( gl.FRAMEBUFFER, this.renderTextureFrameBuffer);
		gl.framebufferTexture2D( 
			gl.FRAMEBUFFER, 
			gl.COLOR_ATTACHMENT0,  
			gl.TEXTURE_2D, 
			this.exitPointTexture,
			0)
		// render 
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			console.log("not working!")
		}

		var sp = this.exitPointShaderProgram
		gl.useProgram(  sp );
		gl.enable( gl.DEPTH_TEST );
		gl.depthFunc( gl.LESS );
		gl.disable( gl.BLEND );
		gl.depthMask( true );

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.FRONT)

		gl.viewport( 0, 0, viewWidth, viewHeight );

		
		//gl.bufferData( gl.FRAMEBUFFER, surfaceVertices, gl.DYNAMIC_DRAW, 0 );

		gl.uniformMatrix4fv( 
			gl.getUniformLocation( sp, "MVP" ), 
			false, 
			dataSpaceToClipSpaceMatrix );		
		gl.uniform1f(
			gl.getUniformLocation( sp, "xDim"),
			dims[0]
		)
		gl.uniform1f(
			gl.getUniformLocation( sp, "yDim"),
			dims[1]
		)
		gl.uniform1f(
			gl.getUniformLocation( sp, "zDim"),
			dims[2]
		)
		gl.bindTexture(gl.TEXTURE_2D, this.exitPointTexture);

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, surfaceVertices, gl.DYNAMIC_DRAW, 0)
		var posAttr = gl.getAttribLocation( sp, "pos" );
		gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( posAttr );
		gl.bindFramebuffer( gl.FRAMEBUFFER, this.renderTextureFrameBuffer );

		gl.drawArrays( 
			gl.TRIANGLES, 
			0, 
			surfaceVertices.length / 3 );   
		
		// 
		gl.disableVertexAttribArray( posAttr );  
		gl.bindFramebuffer( gl.FRAMEBUFFER, null)
	}
	
    // TODO --- INTEGRATE FROM A2
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
		gl.enable( gl.DEPTH_TEST );
		gl.depthFunc( gl.LESS );
		gl.disable( gl.BLEND );
		gl.depthMask( true );


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

    // TODO --- render the instanced view aligned polygons --- fill in the missing part at the end
    // --- modify as/if needed for any cusomizations
	renderViewAlignedCuttingPlanes(
		viewWidth,
		viewHeight, 
		cameraPosVec,
		cameraUpVec,	
		bboxCornersWorldSpace,	
		worldSpaceToClipSpace,
		worldSpaceToDataSpace,
		dims,
		doLighting,
		sampleDistance
	)
	{
		// construct and calculate all attributes
		// vector pointing from (0,0,0) in world space to the camera position
		var normalVec = glMatrix.vec3.create();
		glMatrix.vec3.normalize( normalVec, cameraPosVec );
		glMatrix.vec3.scale( normalVec, normalVec, 1.0 );
		var translationDirection = normalVec;


		var upVector = cameraUpVec;
		glMatrix.vec3.normalize( upVector, upVector );

		// camera right vector
		var rightVec = glMatrix.vec3.create();
		glMatrix.vec3.cross( rightVec, upVector, normalVec );
		glMatrix.vec3.normalize( rightVec, rightVec );
		//console.log(sampleDistance)
		var alphaScale = sampleDistance;
	    var maxDim = Math.max( Math.max( dims[ 0 ], dims[ 1 ] ), dims[ 2 ] );

		// the spacing between the planes in world space
		// divide by maxDim, as this is the way our world space is normalized
		var dt = sampleDistance / maxDim;
		// the data is centered at (0,0,0) in worldspace, so distance to the camera is the length its position vector
		var camDist = glMatrix.vec3.length( cameraPosVec );
		
		// wMax, wMin are the closest and furthest distances from the view aligned plane at the camera position
		// dw is the distance in world space between the closest and furtherest corner of the bounding box
		var wMax = -Infinity;
		var wMin = Infinity;
		var frontIndex = 0;
		for(var i = 0; i < bboxCornersWorldSpace.length; i++) {
			var distVec = glMatrix.vec3.create();
			glMatrix.vec3.subtract(distVec, cameraPosVec, glMatrix.vec3.fromValues(bboxCornersWorldSpace[i][0], bboxCornersWorldSpace[i][1], bboxCornersWorldSpace[i][2]))
			var dist = glMatrix.vec3.length(distVec);
			if(dist > wMax) {
				wMax = dist;
			}
			if(dist < wMin) {
				wMin = dist;
				frontIndex = i;
			}
		}
		var dW = ( wMax - wMin );

		// the number of planes will be that distance divided by the spacing between planes
		var NSample = dW / dt;
		
		// the amount of translation for the furthest plane (we're rendering back to front)
		// wMax - camDist gives us the distance between the furthest point and the base plane
		// we want to start this far back, so it is negative
		var t0 = -( wMax - camDist );

	

		var bboxV2 = bboxCornersWorldSpace[2];
		var bboxV3 = bboxCornersWorldSpace[3];
		var lightWorldPosition = glMatrix.vec3.fromValues((bboxV2[0] + bboxV3[0])/2-1, (bboxV2[1] + bboxV3[1])/2, (bboxV2[2] + bboxV3[2])/2)
		glMatrix.vec3.negate(lightWorldPosition,lightWorldPosition);

		//console.log(lightWorldPosition)

		let v1 = new Float32Array([
			0, 1, 4, 4,
			1, 0, 1, 4,
			0, 2, 5, 5,
			2, 0, 2, 5,
			0, 3, 6, 6,
			3, 0, 3, 6
		])
		let v2 = new Float32Array([
			1, 4, 7, 7,
			5, 1, 4, 7,
			2, 5, 7, 7,
			6, 2, 5, 7,
			3, 6, 7, 7,
			4, 3, 6, 7
		])
		let nSequence = new Float32Array([
			0, 1, 2, 3, 4, 5, 6, 7, // frontIndex = 0
			1, 4, 5, 0, 3, 7, 2, 6, // frontIndex = 1
			2, 0, 5, 6, 3, 1, 7, 4, // frontIndex = 2
			3, 0, 6, 4, 1, 2, 7, 5, // frontIndex = 3
			4, 3, 7, 1, 0, 6, 5, 2, // frontIndex = 4
			5, 1, 7, 2, 0, 4, 6, 3, // frontIndex = 5
			6, 2, 7, 3, 0, 5, 4, 1, // frontIndex = 6
			7, 6, 5, 4, 3, 2, 1, 0, // frontIndex = 7
			
		])

		var Vin = new Array()
		// for(var planeIndex = 0; planeIndex < NSample; ++planeIndex) {
		// 	var geom = [
		// 		0, planeIndex,
		// 		1, planeIndex,
		// 		2, planeIndex,
		// 		0, planeIndex,
		// 		2, planeIndex,
		// 		3, planeIndex,
		// 		0, planeIndex,
		// 		3, planeIndex,
		// 		4, planeIndex,
		// 		0, planeIndex,
		// 		4, planeIndex,
		// 		5, planeIndex
		// 	]
			
		// 	Vin = Vin.concat(geom)
		// 	// for(var pIndex = 0; pIndex < 6; ++pIndex) {
		// 	// 	Vin.push(pIndex)
		// 	// 	Vin.push(planeIndex)
		// 	// }
		// }
		//Vin = new Float32Array(Vin)
		Vin = new Float32Array([0, 1, 2, 3, 4, 5,6])
		
	
		
		let gl = this.gl;
		let sp = this.viewAlignedVolumeRenderShader;

		this.glCanvas.width  = viewWidth;
		this.glCanvas.height = viewHeight;

		gl.viewport( 0, 0, viewWidth, viewHeight );

		gl.disable( gl.CULL_FACE );
		gl.enable( gl.DEPTH_TEST );
		gl.depthFunc( gl.LESS );
		gl.depthMask( false );
		gl.enable( gl.BLEND );
		gl.blendFuncSeparate(
			gl.SRC_ALPHA, 
			gl.ONE_MINUS_SRC_ALPHA, 
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA
		);	

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, Vin, gl.DYNAMIC_DRAW, 0 );

		gl.useProgram(  sp );

		gl.uniform1i( gl.getUniformLocation( sp, "volSampler" ), 0 );
		gl.uniform1i( gl.getUniformLocation( sp, "colSampler" ), 1 );
		gl.uniform1i( gl.getUniformLocation( sp, "opcSampler" ), 2 );

		gl.uniform3fv( gl.getUniformLocation( sp, "vecView" ), new Float32Array( translationDirection ) );
		gl.uniform1f( gl.getUniformLocation( sp, "dt" ), dt );
		//gl.uniform1i( gl.getUniformLocation( sp, "lastIndex" ), NSample-1 );
		gl.uniform1f( gl.getUniformLocation( sp, "t0" ), t0 );

		gl.uniform3fv( gl.getUniformLocation( sp, "lightWorldPosition" ), new Float32Array( lightWorldPosition ) );
		gl.uniform3fv( gl.getUniformLocation( sp, "camWorldPosition" ), new Float32Array( cameraPosVec ) );

		
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_3D, this.volTex );

		gl.activeTexture( gl.TEXTURE1 );
		gl.bindTexture( gl.TEXTURE_2D, this.colTex );

		gl.activeTexture( gl.TEXTURE2 );
		gl.bindTexture( gl.TEXTURE_2D, this.opcTex );

		gl.uniform1f( gl.getUniformLocation( sp, "dataMin" ), this.dataMin );
		gl.uniform1f( gl.getUniformLocation( sp, "dataMax" ), this.dataMax );

		gl.uniform1f( gl.getUniformLocation( sp, "xDim" ), dims[ 0 ] );
		gl.uniform1f( gl.getUniformLocation( sp, "yDim" ), dims[ 1 ] );
		gl.uniform1f( gl.getUniformLocation( sp, "zDim" ), dims[ 2 ] );

		gl.uniform1f( gl.getUniformLocation( sp, "alphaScale" ), alphaScale );
		gl.uniform1i( gl.getUniformLocation( sp, "doLighting" ), doLighting ? 1 : 0 );

		gl.uniformMatrix4fv( 
			gl.getUniformLocation( sp, "M_DATA_SPACE" ), 
			false, 
			worldSpaceToDataSpace ); 

		gl.uniformMatrix4fv( 
			gl.getUniformLocation( sp, "M_CLIP_SPACE" ), 
			false, 
			worldSpaceToClipSpace ); 

		// TODO: other uniforms	
		gl.uniform1iv(gl.getUniformLocation(sp,"nSequence"), nSequence);
		gl.uniform1iv(gl.getUniformLocation(sp,"v1"), v1);
		gl.uniform1iv(gl.getUniformLocation(sp,"v2"),  v2);
		gl.uniform3fv(gl.getUniformLocation(sp,"vecVertices"), new Float32Array(bboxCornersWorldSpace.flat(1)));
		gl.uniform1i(gl.getUniformLocation(sp,"frontIndex"), frontIndex);
		
		
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );

		var intersecAttr = gl.getAttribLocation( sp, "Vin" );

		gl.vertexAttribPointer( intersecAttr, 1, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( intersecAttr );


		gl.drawArraysInstanced(
			gl.TRIANGLE_FAN, 
			0, 
			Vin.length-1, 
			NSample );
		// Vin = new Float32Array([
		// 	0, 1, 2,
		// 	0, 2, 3,
		// 	0, 3, 4,
		// 	0, 4, 5
		// ])
		// gl.drawArraysInstanced(
		// gl.TRIANGLES, 
		// 0, 
		// Vin.length/3, 
		// NSample );
		gl.disableVertexAttribArray( intersecAttr );     
	}
	renderInstancedViewAlignedCuttingPlanes(
		viewWidth, 
		viewHeight, 
		basePolygone, 
		translationDirection,
		t0,
		dt,				
		nPlanes,
		worldSpaceToDataSpace,
        worldSpaceToClipSpace,
		dataDims,
		alphaScale,
		doLighting )
	{
		let gl = this.gl;
		let sp = this.textureBasedVolumeRenderShader;

		this.glCanvas.width  = viewWidth;
		this.glCanvas.height = viewHeight;

		gl.viewport( 0, 0, viewWidth, viewHeight );
		gl.disable( gl.CULL_FACE );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, basePolygone, gl.DYNAMIC_DRAW, 0 );

		gl.useProgram(  sp );

		gl.uniform1i( gl.getUniformLocation( sp, "volSampler" ), 0 );
		gl.uniform1i( gl.getUniformLocation( sp, "colSampler" ), 1 );
		gl.uniform1i( gl.getUniformLocation( sp, "opcSampler" ), 2 );

		gl.uniform3fv( gl.getUniformLocation( sp, "translationDirection" ), new Float32Array( translationDirection ) );
		gl.uniform1f( gl.getUniformLocation( sp, "dt" ), dt );
		gl.uniform1i( gl.getUniformLocation( sp, "lastIndex" ), nPlanes-1 );
		gl.uniform1f( gl.getUniformLocation( sp, "t0" ), t0 );

		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_3D, this.volTex );

		gl.activeTexture( gl.TEXTURE1 );
		gl.bindTexture( gl.TEXTURE_2D, this.colTex );

		gl.activeTexture( gl.TEXTURE2 );
		gl.bindTexture( gl.TEXTURE_2D, this.opcTex );

		gl.uniform1f( gl.getUniformLocation( sp, "dataMin" ), this.dataMin );
		gl.uniform1f( gl.getUniformLocation( sp, "dataMax" ), this.dataMax );

		gl.uniform1f( gl.getUniformLocation( sp, "xDim" ), dataDims[ 0 ] );
		gl.uniform1f( gl.getUniformLocation( sp, "yDim" ), dataDims[ 1 ] );
		gl.uniform1f( gl.getUniformLocation( sp, "zDim" ), dataDims[ 2 ] );

		gl.uniform1f( gl.getUniformLocation( sp, "alphaScale" ), alphaScale );
		gl.uniform1i( gl.getUniformLocation( sp, "doLighting" ), doLighting ? 1 : 0 );

		gl.uniformMatrix4fv( 
			gl.getUniformLocation( sp, "M_DATA_SPACE" ), 
			false, 
			worldSpaceToDataSpace ); 

		gl.uniformMatrix4fv( 
			gl.getUniformLocation( sp, "M_CLIP_SPACE" ), 
			false, 
			worldSpaceToClipSpace ); 

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );

		var posAttr = gl.getAttribLocation( sp, "pos" );

		gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( posAttr );
		
		
		gl.drawArraysInstanced(
			gl.TRIANGLES, 
			0, 
			basePolygone.length / 3, 
			nPlanes );
		
		gl.disableVertexAttribArray( posAttr );     
	}

	// TODO 
	renderTextureBasedVolume( 
		viewWidth,
		viewHeight, 
		cameraPosVec,
		cameraUpVec,	
		bboxCornersWorldSpace,	
		worldSpaceToClipSpace,
		worldSpaceToDataSpace,
		dims,
		doLighting,
		sampleDistance )
	{
 		// vector pointing from (0,0,0) in world space to the camera position
 		var normalVec = glMatrix.vec3.create();
 		glMatrix.vec3.normalize( normalVec, cameraPosVec );
 		glMatrix.vec3.scale( normalVec, normalVec, 1.0 );
 		var translationDirection = normalVec;


 		var upVector = cameraUpVec;
 		glMatrix.vec3.normalize( upVector, upVector );

 		// camera right vector
 		var rightVec = glMatrix.vec3.create();
 		glMatrix.vec3.cross( rightVec, upVector, normalVec );
 		glMatrix.vec3.normalize( rightVec, rightVec );
		
		// construct polygon
		// uncomment to try different implementation
		// remember to uncomment discard in shader program to see the difference
		var polygon = this.secondEfficientPolygon(normalVec, upVector, rightVec, bboxCornersWorldSpace)
		// var polygon = this.thirdEfficientPolygon(upVector, rightVec, bboxCornersWorldSpace)
	
	    var maxDim = Math.max( Math.max( dims[ 0 ], dims[ 1 ] ), dims[ 2 ] );

		// the spacing between the planes in world space
		// divide by maxDim, as this is the way our world space is normalized
		var dt = sampleDistance / maxDim;
		// the data is centered at (0,0,0) in worldspace, so distance to the camera is the length its position vector
		var camDist = glMatrix.vec3.length( cameraPosVec );
		
		// wMax, wMin are the closest and furthest distances from the view aligned plane at the camera position
		// dw is the distance in world space between the closest and furtherest corner of the bounding box
		var wMax = -Infinity;
		var wMin = Infinity;
		for(var i = 0; i < bboxCornersWorldSpace.length; i++) {
			var distVec = glMatrix.vec3.create();
			glMatrix.vec3.subtract(distVec, cameraPosVec, glMatrix.vec3.fromValues(bboxCornersWorldSpace[i][0], bboxCornersWorldSpace[i][1], bboxCornersWorldSpace[i][2]))
			var dist = glMatrix.vec3.length(distVec);
			if(dist > wMax) {
				wMax = dist;
			}
			if(dist < wMin) {
				wMin = dist;
			}
		}
		var dW = ( wMax - wMin );

		// the number of planes will be that distance divided by the spacing between planes
		var NSample = dW / dt;
		
		// the amount of translation for the furthest plane (we're rendering back to front)
		// wMax - camDist gives us the distance between the furthest point and the base plane
		// we want to start this far back, so it is negative
		var t0 = -( wMax - camDist );
		//TODO: DELETE
		doLighting = false;
		//console.log(polygon, translationDirection, t0, dt, NSample)
		this.renderInstancedViewAlignedCuttingPlanes( 
			viewWidth,
			viewHeight,
			polygon,               // the view aligned polygone
			translationDirection,  // the normalized direction vector to translate the polygone in 
		    t0,                    // the amount of translation of the plane to start from
			dt,                    // the amount to translate each plane in world space
			NSample,               // the number of planes to render			
			worldSpaceToDataSpace, // worldSpaceToDataSpace  matrix
			worldSpaceToClipSpace, // worldSpaceToClipSpace  matrix
			dims,                  // data dimensions
			1.0,                   // unit opacity
			doLighting );          // whether to do lighting
	

	}
	secondEfficientPolygon(normalVec, upVector, rightVec, bboxCornersWorldSpace) {
		// negative of up and right vector
		var nrightVec = glMatrix.vec3.create();
		var nupVec = glMatrix.vec3.create();
		glMatrix.vec3.negate(nrightVec, rightVec);
		glMatrix.vec3.negate(nupVec, upVector);

		// plane corners
		var lowerLeft = glMatrix.vec3.create();
		var lowerRight = glMatrix.vec3.create();
		var upperLeft = glMatrix.vec3.create();
		var upperRight = glMatrix.vec3.create();

		//
		// second efficient way
		// 
		var length = 0;
		var width = 0;
		for(var i = 0; i < bboxCornersWorldSpace.length; i++) {
			var cornerVec = glMatrix.vec3.fromValues(bboxCornersWorldSpace[i][0], bboxCornersWorldSpace[i][1], bboxCornersWorldSpace[i][2])
			// projection of corner onto plane
			var pCornerPlaneVec = glMatrix.vec3.create();
			
			var dotCornerNormal = glMatrix.vec3.dot(cornerVec, normalVec);
			glMatrix.vec3.scale(pCornerPlaneVec, normalVec, dotCornerNormal);
			glMatrix.vec3.subtract(pCornerPlaneVec, cornerVec, pCornerPlaneVec);
		
			// projection of corner onto upper vector
			var pCornerUpVec = glMatrix.vec3.create();
			var dotPCornerUp = glMatrix.vec3.dot(pCornerPlaneVec, upVector);
			glMatrix.vec3.scale(pCornerUpVec, upVector, dotPCornerUp);
			var projectedLength = glMatrix.vec3.length(pCornerUpVec);
			if(projectedLength > length) {
				length = projectedLength
			}

			var hypotenuse = glMatrix.vec3.length(pCornerPlaneVec);
			var projectedWidth = Math.sqrt(hypotenuse*hypotenuse - projectedLength*projectedLength);
			if(projectedWidth > width) {
				width = projectedWidth;
			}

		}
		var scaledUpVector = glMatrix.vec3.create();
		var scaledRightVector = glMatrix.vec3.create();
		var scaledNegUpVector = glMatrix.vec3.create();
		var scaledNegRightVector = glMatrix.vec3.create();

		glMatrix.vec3.scale(scaledUpVector, upVector, length)
		glMatrix.vec3.scale(scaledRightVector, rightVec, width)
		glMatrix.vec3.negate(scaledNegUpVector, scaledUpVector)
		glMatrix.vec3.negate(scaledNegRightVector, scaledRightVector)
 		
		glMatrix.vec3.add(lowerLeft, scaledNegUpVector, scaledNegRightVector)
		glMatrix.vec3.add(lowerRight, scaledNegUpVector, scaledRightVector)
		glMatrix.vec3.add(upperLeft, scaledUpVector, scaledNegRightVector)
		glMatrix.vec3.add(upperRight, scaledUpVector, scaledRightVector)

		var polygon = new Float32Array([
			lowerLeft[0], lowerLeft[1], lowerLeft[2],
			lowerRight[0], lowerRight[1], lowerRight[2],
			upperLeft[0], upperLeft[1], upperLeft[2],
			upperLeft[0], upperLeft[1], upperLeft[2],
			lowerRight[0], lowerRight[1], lowerRight[2],
			upperRight[0], upperRight[1], upperRight[2]
		])
		
		return polygon
	}

	thirdEfficientPolygon(upVector, rightVec, bboxCornersWorldSpace) {
		// negative of up and right vector
		var nrightVec = glMatrix.vec3.create();
		var nupVec = glMatrix.vec3.create();
		glMatrix.vec3.negate(nrightVec, rightVec);
		glMatrix.vec3.negate(nupVec, upVector);

		// plane corners
		var lowerLeft = glMatrix.vec3.create();
		var lowerRight = glMatrix.vec3.create();
		var upperLeft = glMatrix.vec3.create();
		var upperRight = glMatrix.vec3.create();
		//
		// third efficient way
		//

		var length = 0;
		for(var i = 0; i < bboxCornersWorldSpace.length; i++) {
			var cornerVec = glMatrix.vec3.fromValues(bboxCornersWorldSpace[i][0], bboxCornersWorldSpace[i][1], bboxCornersWorldSpace[i][2])
			var cornerLen = glMatrix.vec3.length(cornerVec);
			if(cornerLen > length) {
				length = cornerLen;
			}
		}
		glMatrix.vec3.add(lowerLeft, nrightVec,nupVec)
		glMatrix.vec3.add(lowerRight, rightVec,nupVec)
		glMatrix.vec3.add(upperLeft, nrightVec, upVector)
		glMatrix.vec3.add(upperRight, rightVec, upVector)
		glMatrix.vec3.scale(lowerLeft, lowerLeft, length)
		glMatrix.vec3.scale(lowerRight, lowerRight, length)
		glMatrix.vec3.scale(upperLeft, upperLeft, length)
		glMatrix.vec3.scale(upperRight, upperRight, length)

		//
		// end of third efficient way
		//

		var polygon = new Float32Array([
			lowerLeft[0], lowerLeft[1], lowerLeft[2],
			lowerRight[0], lowerRight[1], lowerRight[2],
			upperLeft[0], upperLeft[1], upperLeft[2],
			upperLeft[0], upperLeft[1], upperLeft[2],
			lowerRight[0], lowerRight[1], lowerRight[2],
			upperRight[0], upperRight[1], upperRight[2]
		])
		return polygon
	}
    clear( r, g, b, width, height )
    {
		this.glCanvas.width = width;
		this.glCanvas.height = height;
        var gl = this.gl;     
		gl.depthMask( true );            
        gl.clearColor( 
            r, 
            g, 
            b,             
            1.0 );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		gl.depthMask( false );   
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

	setColorTF( colorTF, opacityTF)
	{
		// merge colorTF and opacityTF together
		// var colorAlphaTF = new Float32Array(colorTF.length + opacityTF.length) 

		// for(var i = 0; i < opacityTF.length; i++) {
		// 	var a = opacityTF[i];
		// 	colorAlphaTF[4*i] = colorTF[3*i] * a
		// 	colorAlphaTF[4*i+1] = colorTF[3*i+1] * a 
		// 	colorAlphaTF[4*i+2] = colorTF[3*i+2] * a
		// 	colorAlphaTF[4*i+3] = a
		// }
    	var gl = this.gl;
		gl.activeTexture( gl.TEXTURE1 );

		gl.bindTexture( gl.TEXTURE_2D, this.colTex );
		//gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		gl.texImage2D(
			gl.TEXTURE_2D,       // texture type
		    0,                   // level
			gl.RGB32F,           // internalFormat
			colorTF.length / 3,  // width
			1,                   // height
			0,                   // border
			gl.RGB,              // format
			gl.FLOAT,            // type
			new Float32Array( colorTF ) );       // data
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    	gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		
		return this;
	}
	setExitPointTexture(width, height) {
		var gl = this.gl

		gl.activeTexture( gl.TEXTURE3 );
		gl.bindTexture(gl.TEXTURE_2D, this.exitPointTexture)
		gl.texImage2D(
			gl.TEXTURE_2D, 
			0, 
			gl.RGBA32F, 
			width, 
			height, 
			0, 
			gl.RGBA,
			gl.FLOAT,
			null)
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		return this
	}
	
	setTF( colorTF, opacityTF )
	{
		this.setColorTF( colorTF, opacityTF );
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

		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_3D, this.volTex );

		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)

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


		// only floating point textures currently support linear filtering/interpolation 
		if( type == "FLOAT" )
		{
	        gl.texParameterf( gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	        gl.texParameterf( gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	        gl.texParameterf( gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
	  		gl.texParameterf( gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		}
		else
		{
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

	setTransparent3DRenderState()
	{
		var gl = this.gl;
		gl.enable( gl.DEPTH_TEST );
		gl.depthFunc( gl.LESS );
		gl.depthMask( false );
		gl.enable( gl.BLEND );
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);	
	}

	setOpaque3DRenderState()
	{
		var gl = this.gl;
		gl.enable( gl.DEPTH_TEST );
		gl.depthFunc( gl.LESS );
		gl.disable( gl.BLEND );
		gl.depthMask( true );
	}
}
