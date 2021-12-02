class VolRenderer {

	static nextId = 0;

	compileShader( vsSrc, fsSrc, name )
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
            window.alert( 'Shader program ' +name +' failed: ' 
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
		
		console.log(gl.getSupportedExtensions())
        // Only continue if WebGL is available and working
        if ( gl === null) {
          window.alert( "Unable to initialize WebGL." );
          return null;
        }    

        // textures

        this.volTex = gl.createTexture();	// 0
        this.colTex = gl.createTexture();	// 1
        this.opcTex = gl.createTexture();   // 2
		this.exitPointTexture = gl.createTexture();	// 3    
		this.preIntTex = gl.createTexture(); // 4

		this.depthTexture = gl.createTexture(); // 5
		this.approxExitPointTexture = gl.createTexture(); // 6
		this.approxEntryPointTexture = gl.createTexture(); // 7

		this.octreeTagTexture = gl.createTexture(); // 8
		this.octreeStartPointTexture = gl.createTexture(); // 9
		this.octreeEndPointTexture = gl.createTexture(); // 10

        // buffers
		this.depthBuffer = this.gl.createFramebuffer();
		this.exitPointFrameBuffer = this.gl.createFramebuffer();
		this.approxExitPointTextureFrameBuffer = this.gl.createFramebuffer();
		this.approxEntryPointTextureFrameBuffer = this.gl.createFramebuffer();
        this.vertexBuffer = this.gl.createBuffer();
        // shaders for simple 3d rendering (bounding boxes axis, etc)

        this.basicShaderProgram = this.compileShader( BasicShader.vsSrc, BasicShader.fsSrc );

        // TODO compile shaders for rendering the cutting planes

        this.cuttingPlaneShaderProgram = this.compileShader( CutPlaneShader.vsSrc, CutPlaneShader.fsSrc );

        // TODO compile shader for rendering view aligned polygones for texture based volume rendering
        
        this.textureBasedVolumeRenderShader = this.compileShader( ViewAlignedPlaneRectShader.vsSrc, ViewAlignedPlaneRectShader.fsSrc, 'ViewAlignedPlaneRect');
		this.raycastingVolumeRenderShader = this.compileShader(RayCastingShader.vsSrc, RayCastingShader.fsSrc, 'RayCasting');
		this.viewAlignedVolumeRenderShader = this.compileShader(ViewAlignedPlanePolygonShader.vsSrc, ViewAlignedPlanePolygonShader.fsSrc, 'ViewAlignedPlanePolygon');
        this.exitPointShaderProgram = this.compileShader(ExitPointShader.vsSrc, ExitPointShader.fsSrc, 'ExitPoint')
		this.depthShaderProgram = this.compileShader(DepthShader.vsSrc, DepthShader.fsSrc, 'Depth')
		return this;
	}
	renderLightSource(  
		viewWidth, 
		veiwHeight, 
		vertices,
		MVP,
		color,
		mode,
		radius )
	{
		var gl = this.gl;
		this.glCanvas.width  = viewWidth;
		this.glCanvas.height = veiwHeight;

		gl.viewport( 0, 0, viewWidth, veiwHeight );

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
		gl.uniform1f(gl.getUniformLocation( this.basicShaderProgram, "pointSize" ), radius)
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );

		var posAttr = gl.getAttribLocation( this.basicShaderProgram, "pos" );
		gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( posAttr );
		gl.drawArrays( 
			mode, 
			0, 
			vertices.length/3);   
		
		gl.disableVertexAttribArray( posAttr );     
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
		if(vertices == null) return;
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
			vertices.length/3);   
		
		gl.disableVertexAttribArray( posAttr );     
    }

	renderRayCastingVolume(
		viewWidth,
		viewHeight, 
		cameraPosVec,
		skipMode,
		nonEmptyGeometry,
		octreeBfsArray,
		bboxFacesDataSpace,
		dataSpaceToClipSpace,
		worldSpaceToClipSpace,
		worldSpaceToDataSpace,
		dataSpaceToWorldSpace,
		dims,
		doLighting,
		preIntegrated,
		lightPosWorldSpace = [0,0,0],
		lightColor = [1.0, 1.0, 1.0],
		sampleDistance
	) {
			if(skipMode == 1) {
				bboxFacesDataSpace = nonEmptyGeometry
				if(bboxFacesDataSpace.length == 0) return;
			}
			// construct and calculate all attributes
			// vector pointing from (0,0,0) in world space to the camera position
			var normalVec = glMatrix.vec3.create();
			glMatrix.vec3.normalize( normalVec, cameraPosVec );
			glMatrix.vec3.scale( normalVec, normalVec, 1.0 );
	
	
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
			var dW = ( wMax - wMin );
	
			
			// light pos
			var lightWorldPosition = glMatrix.vec3.fromValues(lightPosWorldSpace[0], lightPosWorldSpace[1], lightPosWorldSpace[2])
			
			// light color
			var lightColorVec = glMatrix.vec3.fromValues(lightColor[0], lightColor[1], lightColor[2])
			//glMatrix.vec3.negate(lightWorldPosition,lightWorldPosition);
	
			// render
			if(skipMode == 0) {
				this.renderBackfaces(
					viewWidth, 
					viewHeight, 
					bboxFacesDataSpace, 
					dataSpaceToClipSpace, 
					dims
				)
			} else if(skipMode == 1) {
				this.renderApproxEntryPoints(
					viewWidth, 
					viewHeight, 
					bboxFacesDataSpace, 
					dataSpaceToClipSpace, 
					dims
				)
				this.renderApproxExitPoints(
					viewWidth, 
					viewHeight, 
					bboxFacesDataSpace, 
					dataSpaceToClipSpace, 
					dims
				)
			} else if(skipMode == 2) {
				// set octree texture
				this.setOctreeTexture(octreeBfsArray)
				this.renderBackfaces(
					viewWidth, 
					viewHeight, 
					bboxFacesDataSpace, 
					dataSpaceToClipSpace, 
					dims
				)
			}
			let gl = this.gl;	
			let sp = this.raycastingVolumeRenderShader;
			gl.useProgram(sp)
			this.glCanvas.width  = viewWidth;
			this.glCanvas.height = viewHeight;
			gl.viewport( 0, 0, viewWidth, viewHeight );
			
			// gl.depthMask( false );
			//gl.enable( gl.BLEND );
			// gl.blendFuncSeparate(
			// 	gl.SRC_ALPHA, 
			// 	gl.ONE_MINUS_SRC_ALPHA, 
			// 	gl.ONE,
			// 	gl.ONE_MINUS_SRC_ALPHA
			// );
			
			// render only front face
			gl.enable(gl.CULL_FACE);
			gl.cullFace(gl.FRONT);

			// buffer
			gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, bboxFacesDataSpace, gl.DYNAMIC_DRAW, 0 );

			// texture
			gl.activeTexture( gl.TEXTURE0 );
			gl.bindTexture( gl.TEXTURE_3D, this.volTex );
	
			gl.activeTexture( gl.TEXTURE1 );
			gl.bindTexture( gl.TEXTURE_2D, this.colTex );
	
			gl.activeTexture( gl.TEXTURE2 );
			gl.bindTexture( gl.TEXTURE_2D, this.opcTex );
			
			gl.activeTexture( gl.TEXTURE3 );
			gl.bindTexture( gl.TEXTURE_2D, this.exitPointTexture );

			gl.activeTexture( gl.TEXTURE4 );
			gl.bindTexture( gl.TEXTURE_2D, this.preIntTex );

			// gl.activeTexture( gl.TEXTURE5 );
			// gl.bindTexture( gl.TEXTURE_2D, this.depthTexture );
	
			// gl.activeTexture( gl.TEXTURE6 );
			// gl.bindTexture( gl.TEXTURE_2D, this.approxExitPointTexture );
	
			// gl.activeTexture( gl.TEXTURE7 );
			// gl.bindTexture( gl.TEXTURE_2D, this.approxEntryPointTexture );
			// gl.useProgram(  sp );

			// gl.activeTexture( gl.TEXTURE8 );
			// gl.bindTexture( gl.TEXTURE_2D, this.octreeTagTexture );

			// gl.activeTexture( gl.TEXTURE9 );
			// gl.bindTexture( gl.TEXTURE_2D, this.octreeStartPointTexture );

			// gl.activeTexture( gl.TEXTURE10 );
			// gl.bindTexture( gl.TEXTURE_2D, this.octreeEndPointTexture );
			gl.uniform1i( gl.getUniformLocation( sp, "exitPointSampler"), 3);

			
			gl.uniform1i( gl.getUniformLocation( sp, "approxEntryPointDepthSampler"), 5);
			gl.uniform1i( gl.getUniformLocation( sp, "approxExitPointSampler"), 6);
			//gl.uniform1i( gl.getUniformLocation( sp, "approxEntryPointSampler"), 7);
			

			gl.uniform1i( gl.getUniformLocation( sp, "octreeTagSampler"), 8);
			gl.uniform1i( gl.getUniformLocation( sp, "octreeStartPointSampler"), 9);
			gl.uniform1i( gl.getUniformLocation( sp, "octreeEndPointSampler"), 10);
			gl.uniform1i( gl.getUniformLocation( sp, "octreeTextureLength"), octreeBfsArray == null? 0:octreeBfsArray.length);
					
			// uniforms
			gl.uniform1i( gl.getUniformLocation( sp, "volSampler" ), 0 );
			gl.uniform1i( gl.getUniformLocation( sp, "colSampler" ), 1 );
			gl.uniform1i( gl.getUniformLocation( sp, "opcSampler" ), 2 );
			gl.uniform1i( gl.getUniformLocation( sp, "preIntSampler"), 4);

			

			gl.uniform1f( gl.getUniformLocation( sp, "sampleDistance" ), sampleDistance );
			gl.uniform1i( gl.getUniformLocation(sp, "width"), viewWidth);
			gl.uniform1i( gl.getUniformLocation(sp, "height"), viewHeight);
			
			gl.uniform3fv( gl.getUniformLocation( sp, "lightColor" ), new Float32Array( lightColorVec ) );

			gl.uniform3fv( gl.getUniformLocation( sp, "lightWorldPosition" ), new Float32Array( lightWorldPosition ) );
			gl.uniform3fv( gl.getUniformLocation( sp, "camWorldPosition" ), new Float32Array( cameraPosVec ) );
	

			gl.uniform1f( gl.getUniformLocation( sp, "dataMin" ), this.dataMin );
			gl.uniform1f( gl.getUniformLocation( sp, "dataMax" ), this.dataMax );
	
			gl.uniform1f( gl.getUniformLocation( sp, "xDim" ), dims[ 0 ] );
			gl.uniform1f( gl.getUniformLocation( sp, "yDim" ), dims[ 1 ] );
			gl.uniform1f( gl.getUniformLocation( sp, "zDim" ), dims[ 2 ] );
	
			gl.uniform1i( gl.getUniformLocation( sp, "doLighting" ), doLighting ? 1 : 0 );
			gl.uniform1i( gl.getUniformLocation( sp, "preIntegrated" ), preIntegrated ? 1 : 0 );
			gl.uniform1i( gl.getUniformLocation( sp, "skipMode" ), skipMode);
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
			gl.uniformMatrix4fv(
				gl.getUniformLocation( sp, "M_DATA_TO_WORLD_SPACE"),
				false,
				dataSpaceToWorldSpace );
			
			
			
			gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
			gl.bindFramebuffer( gl.FRAMEBUFFER, null );
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
	getNonEmptyFacesGeometry(facesGeometry, brickSize, dims, boundingBoxGeometry) {
		var tmp = [];
		var tmp4BoundingBox = [];
		var bricksLength = {
			x: Math.floor(dims[0] / brickSize),
			y: Math.floor(dims[1] / brickSize),
			z: Math.floor(dims[2] / brickSize)
		}
		for(var i = 0; i < bricksLength.x; i++) {
			for(var j = 0; j < bricksLength.y; j++) {
				for(var k = 0; k < bricksLength.z; k++) {
					var brickIndex = i*bricksLength.y*bricksLength.z + bricksLength.z * j + k;
					var empty = this.checkBrickEmpty({x:i*brickSize, y:j*brickSize, z:k*brickSize}, brickSize, dims);
					
					if(!empty) {
						tmp.push(facesGeometry[brickIndex])
						tmp4BoundingBox.push(boundingBoxGeometry[brickIndex])
					} 
				}
			}
		}
		return [new Float32Array(tmp.flat(1)), new Float32Array(tmp4BoundingBox.flat(1))];		
	}
	checkBrickEmpty(startPoint, brickSize, dims) {
		for(var i = startPoint.x; i < startPoint.x + brickSize; ++i) {
			for(var j = startPoint.y; j < startPoint.y + brickSize; ++j) {
				for(var k = startPoint.z; k < startPoint.z + brickSize; ++k) {
					if(Math.floor(i + j * dims[0] + k * dims[0] * dims[1]) > this.data.length) {
						console.log(this.data.length,i, j, k)
					}
					if(!this.checkDataEmpty(this.data[Math.floor(i + j * dims[0] + k * dims[0] * dims[1])])) return false;
				}
			}
		}
		return true;
	}
	checkDataEmpty(dataValue) {
		var opacityTF = this.opacityTF
		var normalizedData = this.normalizeData(dataValue);
		return (opacityTF[Math.floor(normalizedData * (opacityTF.length-1))] == 0)
	}
	normalizeData(dataValue) {
		return (dataValue - this.dataMin)/(this.dataMax - this.dataMin);
	}

	renderDepthValue(
		viewWidth, 
		viewHeight,
		surfaceVertices,
		dataSpaceToClipSpaceMatrix,
		dims,
		blendEqua) 
	{
		var gl = this.gl
		this.glCanvas.width  = viewWidth;
		this.glCanvas.height  = viewHeight;
		this.setDepthTexture(viewWidth ,  viewHeight);
		//this.setExitPointTexture(viewWidth, viewHeight)
		gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
		gl.bindFramebuffer( gl.FRAMEBUFFER, this.depthBuffer);
		gl.framebufferTexture2D( 
			gl.FRAMEBUFFER, 
			gl.COLOR_ATTACHMENT0,  
			gl.TEXTURE_2D, 
			this.depthTexture,
			0)
		// const depthBufferForFrame = gl.createRenderbuffer();
		// gl.bindRenderbuffer(gl.RENDERBUFFER, depthBufferForFrame);
			
		// // make a depth buffer and the same size as the targetTexture
		// gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, viewWidth, viewHeight);
		// gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBufferForFrame);
		gl.viewport( 0, 0, viewWidth, viewHeight );
		// render 
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			console.log("frame buffer not working!")
		}

		var sp = this.depthShaderProgram
		gl.useProgram(  sp );

		gl.enable(gl.BLEND)
		gl.blendEquation(blendEqua)
	 	
		gl.disable(gl.CULL_FACE)
		// gl.enable(gl.CULL_FACE);
		// gl.cullFace(gl.BACK);
		

		
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
		// gl.uniform1f(
		// 	gl.getUniformLocation( sp, "near"),
		// 	camFrustPlane.near
		// )
		// gl.uniform1f(
		// 	gl.getUniformLocation( sp, "far"),
		// 	camFrustPlane.far
		// )
		
		gl.activeTexture(gl.TEXTURE5);
		gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, surfaceVertices, gl.DYNAMIC_DRAW, 0)
		var posAttr = gl.getAttribLocation( sp, "pos" );
		gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( posAttr );
		gl.bindFramebuffer( gl.FRAMEBUFFER, this.depthBuffer );
		//gl.bindFramebuffer( gl.FRAMEBUFFER, null );

		gl.drawArrays( 
			gl.TRIANGLES, 
			0, 
			surfaceVertices.length / 3 );   
		
		// 
		gl.disableVertexAttribArray( posAttr );  
		gl.bindFramebuffer( gl.FRAMEBUFFER, null)
		gl.disable(gl.DEPTH_TEST)
		gl.enable( gl.BLEND );
	}
	renderApproxEntryPoints(
		viewWidth, 
		viewHeight, 
		surfaceVertices, 
        dataSpaceToClipSpaceMatrix,
		dims
	) {
		if(surfaceVertices.length == 0) return;
		var gl = this.gl

		this.renderDepthValue(viewWidth, viewHeight, surfaceVertices, dataSpaceToClipSpaceMatrix, dims, gl.MIN);
		return;
		this.glCanvas.width  = viewWidth;
		this.glCanvas.height  = viewHeight;
		this.setEntryPointTexture(viewWidth, viewHeight);

		gl.bindFramebuffer( gl.FRAMEBUFFER, this.entryPointTextureFrameBuffer);
		gl.framebufferTexture2D( 
			gl.FRAMEBUFFER, 
			gl.COLOR_ATTACHMENT0,  
			gl.TEXTURE_2D, 
			this.entryPointTexture,
			0)
		
		// render 
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			console.log("frame buffer not working!")
		}


		
		gl.enable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		//gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);	

		//gl.depthFunc( gl.GEQUAL )
		//gl.depthMask(true);
		//gl.clearDepth(1.0);

		// gl.enable(gl.CULL_FACE);
		// gl.cullFace(gl.FRONT)

		gl.viewport( 0, 0, viewWidth, viewHeight );

		// texture
		gl.activeTexture( gl.TEXTURE6 );
		gl.bindTexture( gl.TEXTURE_2D, this.entryPointTexture );

		// buffer
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, surfaceVertices, gl.DYNAMIC_DRAW, 0)
				
		var sp = this.exitPointShaderProgram
		gl.useProgram(  sp );

		// uniforms
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

		gl.uniform1i( gl.getUniformLocation(sp, "width"), viewWidth);
		gl.uniform1i( gl.getUniformLocation(sp, "height"), viewHeight);
		gl.uniform1i( gl.getUniformLocation( sp, "depthSampler" ), 5 );
		gl.uniform1i( gl.getUniformLocation( sp, "flag" ), 0 );

		gl.bindTexture(gl.TEXTURE_2D, this.entryPointTexture);

	

		var posAttr = gl.getAttribLocation( sp, "pos" );
		gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( posAttr );
		gl.bindFramebuffer( gl.FRAMEBUFFER, this.entryPointTextureFrameBuffer );
		gl.bindFramebuffer( gl.FRAMEBUFFER, null );

		gl.drawArrays( 
			gl.TRIANGLES, 
			0, 
			surfaceVertices.length / 3 );   
		
		// 
		gl.disableVertexAttribArray( posAttr );  
		gl.bindFramebuffer( gl.FRAMEBUFFER, null)
		gl.disable(gl.DEPTH_TEST)
		gl.depthFunc(gl.ALWAYS)
		gl.enable( gl.BLEND );
	}
	renderApproxExitPoints(
		viewWidth, 
		viewHeight, 
		surfaceVertices, 
        dataSpaceToClipSpaceMatrix,
		dims) 	
	{
		if(surfaceVertices.length == 0) return;
		var gl = this.gl

		this.renderDepthValue(viewWidth, viewHeight,  surfaceVertices, dataSpaceToClipSpaceMatrix, dims, gl.MAX);

		this.glCanvas.width  = viewWidth;
		this.glCanvas.height  = viewHeight;
		this.setApproxExitPointTexture(viewWidth, viewHeight);

		gl.bindFramebuffer( gl.FRAMEBUFFER, this.approxExitPointTextureFrameBuffer);
		gl.framebufferTexture2D( 
			gl.FRAMEBUFFER, 
			gl.COLOR_ATTACHMENT0,  
			gl.TEXTURE_2D, 
			this.approxExitPointTexture,
			0)
		
		// render 
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			console.log("frame buffer not working!")
		}


		
		gl.enable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		//gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);	

		//gl.depthFunc( gl.GEQUAL )
		//gl.depthMask(true);
		//gl.clearDepth(1.0);

		// gl.enable(gl.CULL_FACE);
		// gl.cullFace(gl.FRONT)

		gl.viewport( 0, 0, viewWidth, viewHeight );

		// texture
		gl.activeTexture( gl.TEXTURE7 );
		gl.bindTexture( gl.TEXTURE_2D, this.approxExitPointTexture );

		// buffer
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, surfaceVertices, gl.DYNAMIC_DRAW, 0)
				
		var sp = this.exitPointShaderProgram
		gl.useProgram(  sp );

		// uniforms
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
		gl.uniform1i( gl.getUniformLocation(sp, "width"), viewWidth);
		gl.uniform1i( gl.getUniformLocation(sp, "height"), viewHeight);
		gl.uniform1i( gl.getUniformLocation( sp, "depthSampler" ), 5 );
		gl.uniform1i( gl.getUniformLocation( sp, "flag" ), 1 );
		gl.uniform1i(gl.getUniformLocation( sp, "skipMode"),1)
		gl.bindTexture(gl.TEXTURE_2D, this.exitPointTexture);

	

		var posAttr = gl.getAttribLocation( sp, "pos" );
		gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( posAttr );
		gl.bindFramebuffer( gl.FRAMEBUFFER, this.approxExitPointTextureFrameBuffer );
		//gl.bindFramebuffer( gl.FRAMEBUFFER, null );

		gl.drawArrays( 
			gl.TRIANGLES, 
			0, 
			surfaceVertices.length / 3 );   
		
		// 
		gl.disableVertexAttribArray( posAttr );  
		gl.bindFramebuffer( gl.FRAMEBUFFER, null)
		gl.disable(gl.DEPTH_TEST)
		gl.depthFunc(gl.ALWAYS)
		gl.enable( gl.BLEND );
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

		gl.bindFramebuffer( gl.FRAMEBUFFER, this.exitPointFrameBuffer);
		gl.framebufferTexture2D( 
			gl.FRAMEBUFFER, 
			gl.COLOR_ATTACHMENT0,  
			gl.TEXTURE_2D, 
			this.exitPointTexture,
			0)
		// render 
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			console.log("frame buffer not working!")
		}

		var sp = this.exitPointShaderProgram
		gl.useProgram(  sp );
		// gl.enable( gl.DEPTH_TEST );
		// gl.depthFunc( gl.LESS );
		// gl.disable( gl.BLEND );
		// gl.depthMask( true );

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK)

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
		gl.uniform1i(
			gl.getUniformLocation( sp, "skipMode"),
			0
		)
		//gl.bindTexture(gl.TEXTURE_2D, this.exitPointTexture);

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, surfaceVertices, gl.DYNAMIC_DRAW, 0)
		var posAttr = gl.getAttribLocation( sp, "pos" );
		gl.vertexAttribPointer( posAttr, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( posAttr );
		gl.bindFramebuffer( gl.FRAMEBUFFER, this.exitPointFrameBuffer );
		//gl.bindFramebuffer( gl.FRAMEBUFFER, null );

		gl.drawArrays( 
			gl.TRIANGLES, 
			0, 
			surfaceVertices.length / 3 );   
		
		// 
		gl.disableVertexAttribArray( posAttr );  
		gl.bindFramebuffer( gl.FRAMEBUFFER, null)
		gl.disable(gl.DEPTH_TEST)
		gl.depthFunc(gl.ALWAYS)
		gl.enable( gl.BLEND );
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
		lightWorldPosition = [0,0,0],
		lightColor = [1.0, 1.0, 1.0],
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

	
		// lightColor
		var lightColorVec = glMatrix.vec3.fromValues(lightColor[0], lightColor[1], lightColor[2])


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
		gl.uniform3fv( gl.getUniformLocation( sp, "lightColor" ), new Float32Array( lightColorVec ) );

		
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
		this.opacityTF = opacityTF
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
	setPreIntegralLookupTable(colorTF, opacityTF) {
		// var length = opacityTF.length;
		// opacityTF = new Array(length).fill(0);
		// opacityTF[length/2-1] = 1;
		// opacityTF[length/2] = 1;
		// opacityTF[length/2+1] = 1;
		// console.log(opacityTF)
		var gl = this.gl;
		var len = opacityTF.length;
		var r = 0, g = 0, b = 0, a = 0;
		var rInt = new Float32Array(len),
		gInt = new Float32Array(len),
		bInt = new Float32Array(len),
		aInt = new Float32Array(len);
		rInt[0] = 0, gInt[0] = 0, bInt[0] = 0, aInt[0] = 0;
		// compute integral functions
		for(var i = 1; i < len; ++i) {
			var tauc = (opacityTF[i-1] + opacityTF[i])/2;
			r +=  tauc * (colorTF[(i-1)*3 + 0] + colorTF[i*3 + 0])/2
			g +=  tauc * (colorTF[(i-1)*3 + 1] + colorTF[i*3 + 1])/2
			b +=  tauc * (colorTF[(i-1)*3 + 2] + colorTF[i*3 + 2])/2
			a += tauc;
			rInt[i] = r;
			gInt[i] = g;
			bInt[i] = b;
			aInt[i] = a;
		}
		var smin, smax, factor;
		var rcol, gcol, bcol, acol;
		var lookupTable = new Float32Array(len*len*4);
		var lookupIndex = 0;
		// compute lookup table	
		for(var sb = 0; sb < len; sb++) {
			for(var sf = 0; sf < len; sf++) {
				if(sb < sf) { 
					smin = sb; 
					smax = sf; 
				}
				else { 
					smin = sf; 
					smax = sb; 
				}
				
				if(smax != smin) {
					factor = 1/(smax - smin);
					rcol = (rInt[smax] - rInt[smin]) * factor;
					gcol = (gInt[smax] - gInt[smin]) * factor;
					bcol = (bInt[smax] - bInt[smin]) * factor;
					acol = (1 - Math.exp(-(aInt[smax] - aInt[smin]) * factor));
				} else {
					factor = 1/(len-1);
					rcol = colorTF[smin*3 + 0] * opacityTF[smin] * factor;
					gcol = colorTF[smin*3 + 1] * opacityTF[smin] * factor;
					bcol = colorTF[smin*3 + 2] * opacityTF[smin] * factor;
					acol = (1 - Math.exp(-opacityTF[smin] * factor))
				}
				var clamp = (a, min, max) => {
					if(a < min) {
						return min;
					} else if(a > max) {
						return max;
					}
					return a;
				}
				lookupTable[lookupIndex + 0] = clamp(rcol, 0, 1);
				lookupTable[lookupIndex + 1] = clamp(gcol, 0, 1);
				lookupTable[lookupIndex + 2] = clamp(bcol, 0, 1);
				lookupTable[lookupIndex + 3] = clamp(acol, 0, 1);
				
				// if(lookupIndex < len*4) {
				// 	console.log(rcol, gcol, bcol)
				// 	console.log(colorTF[lookupIndex/4*3], colorTF[lookupIndex/4*3+1], colorTF[lookupIndex/4*3+2])
				// 	console.log("-------------")
				// }
				lookupIndex += 4;
			}
		}
		gl.activeTexture( gl.TEXTURE4 );

		gl.bindTexture( gl.TEXTURE_2D, this.preIntTex );
		//gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		gl.texImage2D(
			gl.TEXTURE_2D,       // texture type
		    0,                   // level
			gl.RGBA32F,           // internalFormat
			len,  					// width
			len,                   // height
			0,                   // border
			gl.RGBA,              // format
			gl.FLOAT,            // type
			lookupTable );       // data
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    	gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameterf( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		
		return this;
	}
	setColorTF( colorTF )
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
	setDepthTexture(width, height) {
		var gl = this.gl

		gl.activeTexture( gl.TEXTURE5 );
		gl.bindTexture(gl.TEXTURE_2D, this.depthTexture)
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

	setApproxExitPointTexture(width, height) {
		var gl = this.gl

		gl.activeTexture( gl.TEXTURE6 );
		gl.bindTexture(gl.TEXTURE_2D, this.approxExitPointTexture)
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
	setApproxEntryPointTexture(width, height) {
		var gl = this.gl

		gl.activeTexture( gl.TEXTURE7 );
		gl.bindTexture(gl.TEXTURE_2D, this.approxEntryPointTexture)
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
	setOctreeTexture(octreeBfsArray) {
		console.log(octreeBfsArray)
		var gl = this.gl
		var octreeStartPointArray = [];
		var octreeEndPointArray = [];
		var octreeTagsArray = [];
		// construct start point array, end point array, tag array in rgb
		for(var i = 0; i < octreeBfsArray.length; ++i) {
			var node = octreeBfsArray[i];
			// start point array
			octreeStartPointArray = octreeStartPointArray.concat(node.startPoint.flat(1));
			
			// end point array	
			octreeEndPointArray = octreeEndPointArray.concat(node.endPoint.flat(1));

			// tag array
			octreeTagsArray.push(node.firstChildrenIndex)
			octreeTagsArray.push(node.occuClass)
		}
		// tag texture
		gl.activeTexture( gl.TEXTURE8 );
		gl.bindTexture(gl.TEXTURE_2D, this.octreeTagTexture)
		gl.texImage2D(
			gl.TEXTURE_2D, 
			0, 
			gl.RG16UI, 
			octreeTagsArray.length/2, 
			1, 
			0, 
			gl.RG_INTEGER,
			gl.UNSIGNED_SHORT,
			new Uint16Array(octreeTagsArray)
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		// start point texture
		gl.activeTexture( gl.TEXTURE9 );
		gl.bindTexture(gl.TEXTURE_2D, this.octreeStartPointTexture)
		gl.texImage2D(
			gl.TEXTURE_2D, 
			0, 
			gl.RGB16UI, 
			octreeStartPointArray.length/3, 
			1, 
			0, 
			gl.RGB_INTEGER,
			gl.UNSIGNED_SHORT,
			new Uint16Array(octreeStartPointArray)
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

		// end point texture
		gl.activeTexture( gl.TEXTURE10 );
		gl.bindTexture(gl.TEXTURE_2D, this.octreeEndPointTexture)
		gl.texImage2D(
			gl.TEXTURE_2D, 
			0, 
			gl.RGB16UI, 
			octreeEndPointArray.length/3, 
			1, 
			0, 
			gl.RGB_INTEGER,
			gl.UNSIGNED_SHORT,
			new Uint16Array(octreeEndPointArray)
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		return this
	}
	setTF( colorTF, opacityTF )
	{
		this.setColorTF( colorTF );
		this.setOpacityTF( opacityTF );
		this.setPreIntegralLookupTable(colorTF, opacityTF);
		return this;
	}

	setData( data, dims, type, min, max )
	{
		var gl = this.gl;

		this.data = data;
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
